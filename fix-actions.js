const fs = require("fs");
const path = require("path");

const actionsPath = path.join(__dirname, "src/lib/actions.ts");
let content = fs.readFileSync(actionsPath, "utf-8");

// Remove auto-seed in gets (except profile)
content = content.replace(/if \(!list \|\| list\.length === 0\) \{[\s\S]*?return base[a-zA-Z]+;\n\s*\}/g, "");

// Catch in gets (return [])
content = content.replace(/catch \(error\) \{\n\s*console\.warn\("Database query get([a-zA-Z]+) gagal.*?\n\s*return base[a-zA-Z]+;\n\s*\}/g, `catch (error) {
    console.warn("Database query get$1 gagal:", error);
    return [];
  }`);

// Fix saves (Projects)
content = content.replace(
  /\/\/ Simpan secara persisten ke berkas lokal\n\s*const store = getLocalStore\(\);\n\s*const currentList = \(store\?\.projects as ProjectData\[\]\) \|\| \[\.\.\.DUMMY_PROJECTS\];\n\s*const existingIdx = currentList\.findIndex\(\(p\) => p\.id === targetId \|\| \(id && p\.id === id\)\);\n\s*if \(existingIdx >= 0\) \{\n\s*currentList\[existingIdx\] = \{\n\s*\.\.\.currentList\[existingIdx\],\n\s*\.\.\.dummyItem,\n\s*id: currentList\[existingIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*currentList\.unshift\(dummyItem\);\n\s*\}\n\s*updateLocalStore\("projects", currentList\);\n\s*const existingDummyIdx = DUMMY_PROJECTS\.findIndex\(\(p\) => p\.id === id\);\n\s*if \(existingDummyIdx >= 0\) \{\n\s*DUMMY_PROJECTS\[existingDummyIdx\] = \{\n\s*\.\.\.DUMMY_PROJECTS\[existingDummyIdx\],\n\s*\.\.\.dummyItem,\n\s*id: DUMMY_PROJECTS\[existingDummyIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*DUMMY_PROJECTS\.unshift\(dummyItem\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    const currentList = (store?.projects as ProjectData[]) || [...DUMMY_PROJECTS];
    const existingIdx = currentList.findIndex((p) => p.id === targetId || (id && p.id === id));
    if (existingIdx >= 0) {
      currentList[existingIdx] = { ...currentList[existingIdx], ...dummyItem, id: currentList[existingIdx].id };
    } else {
      currentList.unshift(dummyItem);
    }
    updateLocalStore("projects", currentList);
    
    const existingDummyIdx = DUMMY_PROJECTS.findIndex((p) => p.id === id);
    if (existingDummyIdx >= 0) {
      DUMMY_PROJECTS[existingDummyIdx] = { ...DUMMY_PROJECTS[existingDummyIdx], ...dummyItem, id: DUMMY_PROJECTS[existingDummyIdx].id };
    } else {
      DUMMY_PROJECTS.unshift(dummyItem);
    }
  }`
);

// Delete Projects
content = content.replace(
  /const store = getLocalStore\(\);\n\s*if \(store\?\.projects\) \{\n\s*const updated = \(store\.projects as ProjectData\[\]\)\.filter\(\(p\) => p\.id !== id\);\n\s*updateLocalStore\("projects", updated\);\n\s*\}\n\s*const dummyIdx = DUMMY_PROJECTS\.findIndex\(\(p\) => p\.id === id\);\n\s*if \(dummyIdx >= 0\) \{\n\s*DUMMY_PROJECTS\.splice\(dummyIdx, 1\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    if (store?.projects) {
      const updated = (store.projects as ProjectData[]).filter((p) => p.id !== id);
      updateLocalStore("projects", updated);
    }
    const dummyIdx = DUMMY_PROJECTS.findIndex((p) => p.id === id);
    if (dummyIdx >= 0) {
      DUMMY_PROJECTS.splice(dummyIdx, 1);
    }
  }`
);

// Fix saves (Services)
content = content.replace(
  /\/\/ Simpan ke disk lokal\n\s*const store = getLocalStore\(\);\n\s*const currentList = \(store\?\.services as ServiceData\[\]\) \|\| \[\.\.\.DUMMY_SERVICES\];\n\s*const existingIdx = currentList\.findIndex\(\(s\) => s\.id === targetId \|\| \(id && s\.id === id\)\);\n\s*if \(existingIdx >= 0\) \{\n\s*currentList\[existingIdx\] = \{\n\s*\.\.\.currentList\[existingIdx\],\n\s*\.\.\.dummyItem,\n\s*id: currentList\[existingIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*currentList\.push\(dummyItem\);\n\s*\}\n\s*updateLocalStore\("services", currentList\);\n\s*const existingDummyIdx = DUMMY_SERVICES\.findIndex\(\(s\) => s\.id === id\);\n\s*if \(existingDummyIdx >= 0\) \{\n\s*DUMMY_SERVICES\[existingDummyIdx\] = \{\n\s*\.\.\.DUMMY_SERVICES\[existingDummyIdx\],\n\s*\.\.\.dummyItem,\n\s*id: DUMMY_SERVICES\[existingDummyIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*DUMMY_SERVICES\.push\(dummyItem\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    const currentList = (store?.services as ServiceData[]) || [...DUMMY_SERVICES];
    const existingIdx = currentList.findIndex((s) => s.id === targetId || (id && s.id === id));
    if (existingIdx >= 0) {
      currentList[existingIdx] = { ...currentList[existingIdx], ...dummyItem, id: currentList[existingIdx].id };
    } else {
      currentList.push(dummyItem);
    }
    updateLocalStore("services", currentList);
    
    const existingDummyIdx = DUMMY_SERVICES.findIndex((s) => s.id === id);
    if (existingDummyIdx >= 0) {
      DUMMY_SERVICES[existingDummyIdx] = { ...DUMMY_SERVICES[existingDummyIdx], ...dummyItem, id: DUMMY_SERVICES[existingDummyIdx].id };
    } else {
      DUMMY_SERVICES.push(dummyItem);
    }
  }`
);

// Delete Services
content = content.replace(
  /const store = getLocalStore\(\);\n\s*if \(store\?\.services\) \{\n\s*const updated = \(store\.services as ServiceData\[\]\)\.filter\(\(s\) => s\.id !== id\);\n\s*updateLocalStore\("services", updated\);\n\s*\}\n\s*const dummyIdx = DUMMY_SERVICES\.findIndex\(\(s\) => s\.id === id\);\n\s*if \(dummyIdx >= 0\) \{\n\s*DUMMY_SERVICES\.splice\(dummyIdx, 1\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    if (store?.services) {
      const updated = (store.services as ServiceData[]).filter((s) => s.id !== id);
      updateLocalStore("services", updated);
    }
    const dummyIdx = DUMMY_SERVICES.findIndex((s) => s.id === id);
    if (dummyIdx >= 0) {
      DUMMY_SERVICES.splice(dummyIdx, 1);
    }
  }`
);

// Fix saves (Products)
content = content.replace(
  /\/\/ Simpan ke disk lokal\n\s*const store = getLocalStore\(\);\n\s*const currentList = \(store\?\.products as ProductData\[\]\) \|\| \[\.\.\.DUMMY_PRODUCTS\];\n\s*const existingIdx = currentList\.findIndex\(\(p\) => p\.id === targetId \|\| \(id && p\.id === id\)\);\n\s*if \(existingIdx >= 0\) \{\n\s*currentList\[existingIdx\] = \{\n\s*\.\.\.currentList\[existingIdx\],\n\s*\.\.\.dummyItem,\n\s*id: currentList\[existingIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*currentList\.push\(dummyItem\);\n\s*\}\n\s*updateLocalStore\("products", currentList\);\n\s*const existingDummyIdx = DUMMY_PRODUCTS\.findIndex\(\(p\) => p\.id === id\);\n\s*if \(existingDummyIdx >= 0\) \{\n\s*DUMMY_PRODUCTS\[existingDummyIdx\] = \{\n\s*\.\.\.DUMMY_PRODUCTS\[existingDummyIdx\],\n\s*\.\.\.dummyItem,\n\s*id: DUMMY_PRODUCTS\[existingDummyIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*DUMMY_PRODUCTS\.push\(dummyItem\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    const currentList = (store?.products as ProductData[]) || [...DUMMY_PRODUCTS];
    const existingIdx = currentList.findIndex((p) => p.id === targetId || (id && p.id === id));
    if (existingIdx >= 0) {
      currentList[existingIdx] = { ...currentList[existingIdx], ...dummyItem, id: currentList[existingIdx].id };
    } else {
      currentList.push(dummyItem);
    }
    updateLocalStore("products", currentList);
    
    const existingDummyIdx = DUMMY_PRODUCTS.findIndex((p) => p.id === id);
    if (existingDummyIdx >= 0) {
      DUMMY_PRODUCTS[existingDummyIdx] = { ...DUMMY_PRODUCTS[existingDummyIdx], ...dummyItem, id: DUMMY_PRODUCTS[existingDummyIdx].id };
    } else {
      DUMMY_PRODUCTS.push(dummyItem);
    }
  }`
);

// Delete Products
content = content.replace(
  /const store = getLocalStore\(\);\n\s*if \(store\?\.products\) \{\n\s*const updated = \(store\.products as ProductData\[\]\)\.filter\(\(p\) => p\.id !== id\);\n\s*updateLocalStore\("products", updated\);\n\s*\}\n\s*const dummyIdx = DUMMY_PRODUCTS\.findIndex\(\(p\) => p\.id === id\);\n\s*if \(dummyIdx >= 0\) \{\n\s*DUMMY_PRODUCTS\.splice\(dummyIdx, 1\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    if (store?.products) {
      const updated = (store.products as ProductData[]).filter((p) => p.id !== id);
      updateLocalStore("products", updated);
    }
    const dummyIdx = DUMMY_PRODUCTS.findIndex((p) => p.id === id);
    if (dummyIdx >= 0) {
      DUMMY_PRODUCTS.splice(dummyIdx, 1);
    }
  }`
);

// Fix saves (Testimonials)
content = content.replace(
  /\/\/ Simpan ke disk lokal\n\s*const store = getLocalStore\(\);\n\s*const currentList = \(store\?\.testimonials as TestimonialData\[\]\) \|\| \[\.\.\.DUMMY_TESTIMONIALS\];\n\s*const existingIdx = currentList\.findIndex\(\(t\) => t\.id === targetId \|\| \(id && t\.id === id\)\);\n\s*if \(existingIdx >= 0\) \{\n\s*currentList\[existingIdx\] = \{\n\s*\.\.\.currentList\[existingIdx\],\n\s*\.\.\.dummyItem,\n\s*id: currentList\[existingIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*currentList\.push\(dummyItem\);\n\s*\}\n\s*updateLocalStore\("testimonials", currentList\);\n\s*const existingDummyIdx = DUMMY_TESTIMONIALS\.findIndex\(\(t\) => t\.id === id\);\n\s*if \(existingDummyIdx >= 0\) \{\n\s*DUMMY_TESTIMONIALS\[existingDummyIdx\] = \{\n\s*\.\.\.DUMMY_TESTIMONIALS\[existingDummyIdx\],\n\s*\.\.\.dummyItem,\n\s*id: DUMMY_TESTIMONIALS\[existingDummyIdx\]\.id,\n\s*\};\n\s*\} else \{\n\s*DUMMY_TESTIMONIALS\.push\(dummyItem\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    const currentList = (store?.testimonials as TestimonialData[]) || [...DUMMY_TESTIMONIALS];
    const existingIdx = currentList.findIndex((t) => t.id === targetId || (id && t.id === id));
    if (existingIdx >= 0) {
      currentList[existingIdx] = { ...currentList[existingIdx], ...dummyItem, id: currentList[existingIdx].id };
    } else {
      currentList.push(dummyItem);
    }
    updateLocalStore("testimonials", currentList);
    
    const existingDummyIdx = DUMMY_TESTIMONIALS.findIndex((t) => t.id === id);
    if (existingDummyIdx >= 0) {
      DUMMY_TESTIMONIALS[existingDummyIdx] = { ...DUMMY_TESTIMONIALS[existingDummyIdx], ...dummyItem, id: DUMMY_TESTIMONIALS[existingDummyIdx].id };
    } else {
      DUMMY_TESTIMONIALS.push(dummyItem);
    }
  }`
);

// Delete Testimonials
content = content.replace(
  /const store = getLocalStore\(\);\n\s*if \(store\?\.testimonials\) \{\n\s*const updated = \(store\.testimonials as TestimonialData\[\]\)\.filter\(\(p\) => p\.id !== id\);\n\s*updateLocalStore\("testimonials", updated\);\n\s*\}\n\s*const dummyIdx = DUMMY_TESTIMONIALS\.findIndex\(\(p\) => p\.id === id\);\n\s*if \(dummyIdx >= 0\) \{\n\s*DUMMY_TESTIMONIALS\.splice\(dummyIdx, 1\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    if (store?.testimonials) {
      const updated = (store.testimonials as TestimonialData[]).filter((p) => p.id !== id);
      updateLocalStore("testimonials", updated);
    }
    const dummyIdx = DUMMY_TESTIMONIALS.findIndex((p) => p.id === id);
    if (dummyIdx >= 0) {
      DUMMY_TESTIMONIALS.splice(dummyIdx, 1);
    }
  }`
);

// Fix saves (Articles)
content = content.replace(
  /\/\/ 1\. Simpan ke local store\n\s*const store = getLocalStore\(\);\n\s*const currentArticles = \(store\?\.articles as ArticleData\[\]\) \|\| \[\.\.\.DUMMY_ARTICLES\];\n\s*const existingIdx = currentArticles\.findIndex\(\(a\) => a\.id === articleId\);\n\s*if \(existingIdx >= 0\) \{\n\s*articleRecord\.createdAt = currentArticles\[existingIdx\]\.createdAt \|\| now;\n\s*currentArticles\[existingIdx\] = articleRecord;\n\s*\} else \{\n\s*currentArticles\.push\(articleRecord\);\n\s*\}\n\s*updateLocalStore\("articles", currentArticles\);/,
  `// 1. Simpan ke local store
  if (!isDbConnected) {
    const store = getLocalStore();
    const currentArticles = (store?.articles as ArticleData[]) || [...DUMMY_ARTICLES];
    const existingIdx = currentArticles.findIndex((a) => a.id === articleId);

    if (existingIdx >= 0) {
      articleRecord.createdAt = currentArticles[existingIdx].createdAt || now;
      currentArticles[existingIdx] = articleRecord;
    } else {
      currentArticles.push(articleRecord);
    }
    updateLocalStore("articles", currentArticles);
  }`
);

// Delete Articles
content = content.replace(
  /const store = getLocalStore\(\);\n\s*if \(store\?\.articles\) \{\n\s*const updated = \(store\.articles as ArticleData\[\]\)\.filter\(\(a\) => a\.id !== id\);\n\s*updateLocalStore\("articles", updated\);\n\s*\}\n\s*const dummyIdx = DUMMY_ARTICLES\.findIndex\(\(a\) => a\.id === id\);\n\s*if \(dummyIdx >= 0\) \{\n\s*DUMMY_ARTICLES\.splice\(dummyIdx, 1\);\n\s*\}/,
  `if (!isDbConnected) {
    const store = getLocalStore();
    if (store?.articles) {
      const updated = (store.articles as ArticleData[]).filter((a) => a.id !== id);
      updateLocalStore("articles", updated);
    }
    const dummyIdx = DUMMY_ARTICLES.findIndex((a) => a.id === id);
    if (dummyIdx >= 0) {
      DUMMY_ARTICLES.splice(dummyIdx, 1);
    }
  }`
);


fs.writeFileSync(actionsPath, content);
console.log("actions.ts updated successfully");
