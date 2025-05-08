const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a student'],
    },
    subscription: {
      type: mongoose.Schema.ObjectId,
      ref: 'Subscription',
      required: [true, 'Transaction must be associated with a subscription'],
    },
    transactionId: {
      type: String,
      unique: true,
      required: [true, 'Transaction ID is required'],
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: ['payment', 'refund', 'adjustment'],
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'other'],
      required: [true, 'Payment method is required'],
    },
    paymentGateway: {
      type: String,
      enum: ['stripe', 'paypal', 'manual', 'other'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
      default: 'pending',
    },
    notes: String,
    billingAddress: {
      name: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    refundedTransaction: {
      type: mongoose.Schema.ObjectId,
      ref: 'Transaction',
    },
    invoiceId: String,
    invoiceUrl: String,
    receiptUrl: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
transactionSchema.index({ student: 1 });
transactionSchema.index({ subscription: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ status: 1 });

// Pre-save hook to generate transaction ID if not provided
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 10000);
    this.transactionId = `TRX-${timestamp}-${randomNum}`;
  }
  next();
});

// Populate references when the document is queried
transactionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'student',
    select: 'name email',
  }).populate({
    path: 'subscription',
    select: 'plan startDate endDate status',
  });
  next();
});

// Virtual field for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return `${this.amount} ${this.currency}`;
});

// Static method to generate invoice
transactionSchema.statics.generateInvoice = async function(transactionId) {
  try {
    const transaction = await this.findOne({ transactionId });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // In a real application, this would generate a PDF or HTML invoice
    // For now, we'll just update the invoice fields
    transaction.invoiceId = `INV-${transaction.transactionId}`;
    transaction.invoiceUrl = `/invoices/${transaction.invoiceId}`;
    await transaction.save();
    
    return {
      invoiceId: transaction.invoiceId,
      invoiceUrl: transaction.invoiceUrl,
    };
  } catch (err) {
    throw err;
  }
};

// Static method to process refund
transactionSchema.statics.processRefund = async function(transactionId, amount, reason) {
  try {
    const originalTransaction = await this.findOne({ transactionId });
    
    if (!originalTransaction) {
      throw new Error('Transaction not found');
    }
    
    if (originalTransaction.status !== 'completed') {
      throw new Error('Only completed transactions can be refunded');
    }
    
    // Validate refund amount
    const refundAmount = amount || originalTransaction.amount;
    if (refundAmount > originalTransaction.amount) {
      throw new Error('Refund amount cannot exceed the original transaction amount');
    }
    
    // Create refund transaction
    const refundTransaction = await this.create({
      student: originalTransaction.student,
      subscription: originalTransaction.subscription,
      type: 'refund',
      amount: refundAmount,
      currency: originalTransaction.currency,
      paymentMethod: originalTransaction.paymentMethod,
      paymentGateway: originalTransaction.paymentGateway,
      status: 'completed',
      notes: reason || 'Refund processed',
      refundedTransaction: originalTransaction._id,
    });
    
    // Update original transaction
    originalTransaction.status = 'refunded';
    await originalTransaction.save();
    
    return refundTransaction;
  } catch (err) {
    throw err;
  }
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 