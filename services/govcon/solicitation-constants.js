'use strict';

// One limit shared by renderer-facing contracts, IPC, import preflight and
// ZIP expansion. A "document" is a supported direct file or a supported
// logical file inside a ZIP.
const MAX_SOLICITATION_DOCUMENTS = 5;
const SOLICITATION_LIMIT_MESSAGE = 'Select up to 5 solicitation documents per upload.';
const SUPPORTED_SOLICITATION_EXTENSIONS = Object.freeze([
  '.pdf', '.docx', '.xlsx', '.csv', '.txt', '.xml', '.zip'
]);

module.exports = {
  MAX_SOLICITATION_DOCUMENTS,
  SOLICITATION_LIMIT_MESSAGE,
  SUPPORTED_SOLICITATION_EXTENSIONS
};
