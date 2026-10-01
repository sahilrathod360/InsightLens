import zlib from 'zlib';

/**
 * Creates a valid, standard PKZip archive buffer in memory without external dependencies.
 * @param {Array<{path: string, content: Buffer | string}>} files 
 * @returns {Buffer}
 */
export function createZipBuffer(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const filePath = file.path.replace(/\\/g, '/');
    const pathBuf = Buffer.from(filePath, 'utf8');
    const uncompressedBuf = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content || '', 'utf8');

    const crc = zlib.crc32 ? zlib.crc32(uncompressedBuf) : 0;
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf);

    // Use compressed data if smaller, else store
    const useDeflate = compressedBuf.length < uncompressedBuf.length;
    const dataBuf = useDeflate ? compressedBuf : uncompressedBuf;
    const compressionMethod = useDeflate ? 8 : 0;

    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2))) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    // 1. Local File Header (30 bytes + filename + data)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed: 2.0
    localHeader.writeUInt16LE(0, 6);          // General flag
    localHeader.writeUInt16LE(compressionMethod, 8); // Method: 8 (Deflate) or 0 (Store)
    localHeader.writeUInt16LE(dosTime, 10);   // Mod time
    localHeader.writeUInt16LE(dosDate, 12);   // Mod date
    localHeader.writeUInt32LE(crc >>> 0, 14); // CRC-32
    localHeader.writeUInt32LE(dataBuf.length, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedBuf.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(pathBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28);         // Extra field length

    const localChunk = Buffer.concat([localHeader, pathBuf, dataBuf]);
    localHeaders.push(localChunk);

    // 2. Central Directory Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central header signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by: 2.0
    centralHeader.writeUInt16LE(20, 6);         // Version needed: 2.0
    centralHeader.writeUInt16LE(0, 8);          // General flag
    centralHeader.writeUInt16LE(compressionMethod, 10); // Method
    centralHeader.writeUInt16LE(dosTime, 12);   // Mod time
    centralHeader.writeUInt16LE(dosDate, 14);   // Mod date
    centralHeader.writeUInt32LE(crc >>> 0, 16); // CRC-32
    centralHeader.writeUInt32LE(dataBuf.length, 20); // Compressed size
    centralHeader.writeUInt32LE(uncompressedBuf.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(pathBuf.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30);         // Extra field length
    centralHeader.writeUInt16LE(0, 32);         // Comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk start
    centralHeader.writeUInt16LE(0, 36);         // Internal attributes
    centralHeader.writeUInt32LE(0, 38);         // External attributes
    centralHeader.writeUInt32LE(offset, 42);    // Local header offset

    const centralChunk = Buffer.concat([centralHeader, pathBuf]);
    centralHeaders.push(centralChunk);

    offset += localChunk.length;
  }

  const localData = Buffer.concat(localHeaders);
  const centralData = Buffer.concat(centralHeaders);

  // 3. End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // EOCD signature
  eocd.writeUInt16LE(0, 4);                   // Disk number
  eocd.writeUInt16LE(0, 6);                   // Central dir start disk
  eocd.writeUInt16LE(files.length, 8);        // Records on disk
  eocd.writeUInt16LE(files.length, 10);       // Total records
  eocd.writeUInt32LE(centralData.length, 12); // Central dir size
  eocd.writeUInt32LE(localData.length, 16);   // Central dir offset
  eocd.writeUInt16LE(0, 20);                  // Comment length

  return Buffer.concat([localData, centralData, eocd]);
}
