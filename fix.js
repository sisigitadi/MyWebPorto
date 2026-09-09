const fs = require('fs');

const path = 'src/components/public/hero-section.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/<img\s*src=\{profile\.avatarUrl\}/, '<img src={profile.avatarUrl} loading="eager" fetchPriority="high" decoding="sync"');
  fs.writeFileSync(path, content);
  console.log('Updated ' + path);
}
