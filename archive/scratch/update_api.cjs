const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.jsx') || dirFile.endsWith('.js') || dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;
  
  // Replace string literals
  content = content.replace(/\"http:\/\/127\.0\.0\.1:5000(\/.*?)\"/g, '(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "$1"');
  content = content.replace(/'http:\/\/127\.0\.0\.1:5000(\/.*?)'/g, "(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000') + '$1'");
  
  // Replace template literals
  content = content.replace(/\`http:\/\/127\.0\.0\.1:5000(\/.*?)\`/g, "`\\${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}$1`");
  
  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
