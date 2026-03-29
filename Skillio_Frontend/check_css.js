const fs = require('fs');
const path = require('path');

const componentsPath = path.join('c:/Users/SIDDHESH/Downloads/Skillio-Backend-main/Skillio_Frontend/src/app/components');

function findCSS(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findCSS(filePath));
      } else if (file.endsWith('.css')) {
        results.push(filePath);
      }
    });
  } catch (err) {
    console.error('Error reading ' + dir, err);
  }
  return results;
}

const files = findCSS(componentsPath);
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if(!content.includes('@media')) {
    console.log('No @media:', file);
  } else if(content.includes('.table-container') && !content.includes('overflow-x: auto')) {
    console.log('Has table-container but no overflow-x: auto:', file);
  } else if(!content.includes('overflow-x: auto')) {
    // maybe it needs some check
  }
});
console.log('Done scanning ' + files.length + ' files.');
