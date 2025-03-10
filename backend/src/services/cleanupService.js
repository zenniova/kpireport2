const fs = require('fs');
const path = require('path');

const cleanupUploads = () => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  
  // Baca semua file di folder uploads
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      return;
    }

    const now = Date.now();
    const maxAge = 1 * 60 * 60 * 1000; // 1 jam dalam milliseconds

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      
      // Dapatkan stats file
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file ${file}:`, err);
          return;
        }

        // Cek umur file
        const fileAge = now - stats.mtimeMs;
        
        // Hapus file jika lebih tua dari maxAge
        if (fileAge > maxAge) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error(`Error deleting file ${file}:`, err);
            } else {
              console.log(`Deleted old file: ${file}`);
            }
          });
        }
      });
    });
  });
};

module.exports = cleanupUploads; 