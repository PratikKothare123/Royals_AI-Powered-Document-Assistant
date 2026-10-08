const pdfParse = require('pdf-parse');
const DocumentChunk = require('../models/DocumentChunks');

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text ? pdfData.text.trim() : '';

    if (!extractedText) {
      return res.status(400).json({ error: 'PDF contains no readable text.' });
    }

    const documentName = req.file.originalname;
    const chunkSize = 1000;
    const totalPages = pdfData.numpages || 1;
    const totalLength = extractedText.length;

    const chunks = [];
    let start = 0;

    while (start < totalLength) {
      const end = Math.min(start + chunkSize, totalLength);
      const chunkText = extractedText.substring(start, end).trim();

      if (chunkText) {
        const estimatedPage = Math.min(
          Math.floor((start / totalLength) * totalPages) + 1,
          totalPages
        );

        chunks.push({
          documentName,
          chunkText,
          pageNumber: estimatedPage
        });
      }

      start += chunkSize;
    }

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Could not create valid chunks from PDF text.' });
    }

    await DocumentChunk.insertMany(chunks);

    return res.status(200).json({
      message: 'Document uploaded successfully',
      documentName,
      chunksCreated: chunks.length
    });
  } catch (error) {
    console.error('PDF Upload Error:', error.message);
    return res.status(500).json({ error: 'Failed to process PDF document.' });
  }
};

module.exports = { uploadDocument };
