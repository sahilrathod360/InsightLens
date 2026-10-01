import zlib from 'zlib';

/**
 * Parses a standard PKZip buffer in memory and returns a Map of filename -> content string.
 * @param {Buffer} buffer 
 * @returns {Map<string, string>}
 */
export function extractZipEntries(buffer) {
  const entries = new Map();
  let pos = 0;

  while (pos < buffer.length - 4) {
    const sig = buffer.readUInt32LE(pos);
    if (sig === 0x04034b50) {
      // Local File Header
      const method = buffer.readUInt16LE(pos + 8);
      const compSize = buffer.readUInt32LE(pos + 18);
      const uncompSize = buffer.readUInt32LE(pos + 22);
      const fnLen = buffer.readUInt16LE(pos + 26);
      const extraLen = buffer.readUInt16LE(pos + 28);
      const filename = buffer.toString('utf8', pos + 30, pos + 30 + fnLen);
      const dataStart = pos + 30 + fnLen + extraLen;
      const dataSlice = buffer.subarray(dataStart, dataStart + compSize);

      let content = '';
      if (method === 8) {
        content = zlib.inflateRawSync(dataSlice).toString('utf8');
      } else {
        content = dataSlice.toString('utf8');
      }

      entries.set(filename, content);
      pos = dataStart + compSize;
    } else if (sig === 0x02014b50 || sig === 0x06054b50) {
      // Central Directory or End of Central Directory
      break;
    } else {
      pos++;
    }
  }

  return entries;
}
