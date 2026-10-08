const mongoose = require('mongoose');

const DocumentChunkSchema = new mongoose.Schema(
  {
    documentName: {
      type: String,
      required: true
    },
    chunkText: {
      type: String,
      required: true
    },
    pageNumber: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DocumentChunk', DocumentChunkSchema);
