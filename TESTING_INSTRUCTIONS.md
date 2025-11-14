# 🧪 Phase 1 Testing Instructions

## ✅ **Setup Complete!**

**Package Installed**: `@xenova/transformers@2.17.2` ✓

---

## 🚀 **How to Test the New Features**

### **Step 1: Start the Development Server**

Open a new terminal (Command Prompt or PowerShell) and run:

```bash
cd "c:\Users\PRANAY\Downloads\Cap\Design AI Learning Assistant UI (Copy) (Copy)"
npm run dev
```

**Expected Output**:
```
VITE v6.3.5  ready in XXX ms

➜  Local:   http://localhost:3000/
```

---

### **Step 2: Open the Application**

1. Open your browser
2. Go to `http://localhost:3000`
3. **Open Browser Console** (Press `F12` → Console tab)
   - This is where you'll see BERT initialization messages

---

### **Step 3: Upload a Test Document**

**Option A: Use Sample Text**
- Create a simple text file with some technical content:
  ```
  Docker is a containerization platform that enables developers to package 
  applications into containers. Containers are lightweight, portable units 
  that include everything needed to run an application. Microservices 
  architecture often uses Docker containers for deployment. Kubernetes 
  orchestrates Docker containers at scale.
  ```

**Option B: Use Any PDF/DOCX**
- Any technical document or research paper works
- Longer documents = more concepts = more visible differences

---

### **Step 4: Generate Concept Map**

1. Click on your uploaded document
2. Click the **"Concept Maps"** card
3. Click **"Generate Concept Map"**
4. **Watch the Browser Console!**

---

## 🔍 **What to Look For**

### **A. In Browser Console (F12)**

You should see these messages **in order**:

```
🧠 Generating concept map with Gemini... (Attempt 1/3)
📄 Raw Gemini response (first 300 chars): {...
✅ Successfully parsed concept map JSON
✅ Generated concept map: 15 nodes, 24 edges

🔬 Enriching concept map with BERT semantic similarity scores...
🔧 Initializing BERT Embedding Service...
📦 Model: Xenova/all-MiniLM-L6-v2
✅ BERT model loaded in 2340ms  ← FIRST TIME (downloads model)
📊 Embedding dimensions: 384
🔬 BERT service initialized, calculating semantic similarities...

✅ Similarity enrichment complete:
   - Success: 24/24 edges
   - Failed: 0/24 edges
   - Duration: 1850ms (avg 77ms per edge)

📊 BERT Embedding Service Statistics:
   Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
   Uptime: 4s
   Total encodings: 48
   Cache: 48 entries
   Cache hit rate: 0%
   Avg inference time: 38ms
```

**Note**: First load downloads ~50MB model (one-time, 30-60 seconds depending on internet)

---

### **B. In the Concept Map Visualization**

#### **Edge Thickness (MAIN VISUAL CHANGE)**:

**BEFORE** (without BERT):
- All edges look the same: thin 2px white lines

**AFTER** (with BERT):
- **THICK edges** (4-5px) = Strong semantic similarity (>80%)
  - Example: "Docker" → "Container" (very related concepts)
- **MEDIUM edges** (2-3px) = Moderate similarity (50-80%)
- **THIN edges** (1-2px) = Weak similarity (<50%)
  - Example: "Docker" → "Neural Network" (loosely related)

#### **Hover Tooltips (ENHANCED INFO)**:

**Hover over any edge** (line connecting two concepts)

**BEFORE**:
```
uses
```

**AFTER**:
```
uses
📊 Similarity: 87%
```

The percentage tells you how mathematically similar the two concepts are based on their definitions.

---

### **C. Performance Check**

#### **First Concept Map** (Cold Start):
- Time: ~10-30 seconds (includes model download)
- Console shows: "BERT model loaded in XXXXms"

#### **Second Concept Map** (Model Cached):
- Time: ~2-5 seconds (model already in browser)
- Console shows: "Cache hit rate: XX%" (increases each time)

#### **Normal Behavior**:
- Concept map still generates if BERT fails
- You'll see: "⚠️ Could not add semantic similarity (graceful degradation)"
- Graph works normally, just without similarity scores

---

## ✅ **Success Criteria**

You've successfully tested Phase 1 if you see:

- ✅ Console message: "✅ BERT model loaded"
- ✅ Console message: "✅ Similarity enrichment complete: Success: XX/XX edges"
- ✅ Visual: Graph has THICK and THIN edges (not all the same)
- ✅ Tooltip: Shows "📊 Similarity: XX%" when hovering edges
- ✅ Performance: Second concept map is much faster than first

---

## ❌ **Troubleshooting**

### **Issue 1: "Cannot find module '@xenova/transformers'"**
**Solution**: Run `npm install` again
```bash
P:\VS\npm.cmd install
```

### **Issue 2: BERT model fails to load**
**Symptoms**: 
```
⚠️ Could not add semantic similarity (graceful degradation): Failed to fetch
```

**Causes**:
- Slow internet connection
- Firewall blocking CDN
- Browser cache issues

**Solution**: 
- Refresh page and try again
- Check internet connection
- Clear browser cache (Ctrl+Shift+Delete)

**Workaround**: App still works! Just without similarity scores (original behavior)

### **Issue 3: Edges all look the same thickness**
**Check**:
1. Did console show "✅ Similarity enrichment complete"?
2. Are you hovering edges? (tooltip should show percentage)
3. Try a different document (some might have uniformly similar concepts)

### **Issue 4: Console shows TypeScript errors**
**Symptoms**: Red errors in browser console about types

**Solution**: Restart dev server
```bash
Ctrl+C (stop server)
npm run dev (restart)
```

---

## 📊 **Expected Performance Metrics**

| Metric | First Load | Subsequent Loads |
|--------|-----------|------------------|
| Model Download | 30-60s | 0s (cached) |
| Model Initialization | 2-3s | 0.5s |
| Encoding per concept | 50-100ms | 10-20ms (cached) |
| Total enrichment (20 edges) | 3-5s | 0.5-1s |
| Cache hit rate | 0% | 50-80% |

---

## 🎯 **What Each Similarity Percentage Means**

| Similarity | Meaning | Example |
|-----------|---------|---------|
| **90-100%** | Nearly identical concepts | "Docker" ↔ "Docker Container" |
| **75-90%** | Strongly related | "CNN" ↔ "Convolutional Neural Network" |
| **50-75%** | Moderately related | "Docker" ↔ "Microservices" |
| **25-50%** | Loosely related | "Docker" ↔ "Machine Learning" |
| **0-25%** | Barely related | "Docker" ↔ "Photosynthesis" |

---

## 🔬 **Advanced Testing (Optional)**

### **Test Graceful Degradation**:

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Set throttling to **Offline**
4. Try generating concept map
5. **Expected**: App works, but console shows:
   ```
   ⚠️ Could not add semantic similarity (graceful degradation): Failed to fetch
   ```
6. Concept map still appears (without similarity scores)
7. Set back to **Online**

### **Test Caching**:

1. Generate concept map (note the time)
2. Delete and re-upload the same document
3. Generate concept map again
4. Check console: "Cache hit rate: XX%"
5. **Expected**: Second generation is MUCH faster

### **Test Multiple Documents**:

1. Upload 3 different documents
2. Generate concept maps for each
3. Watch cache hit rate increase
4. Check statistics: `embeddingService.printStats()`

---

## 📝 **What to Report Back**

After testing, please share:

1. ✅ Did BERT model load successfully?
2. ✅ Do you see thick/thin edges?
3. ✅ Do tooltips show similarity percentages?
4. ⏱️ How long did first concept map take?
5. ⏱️ How long did second concept map take?
6. 📊 Final cache hit rate (check console statistics)
7. 🐛 Any errors or issues?

---

## 🎉 **Next Steps After Testing**

If Phase 1 works well, we can proceed with:

- **Phase 2**: Multi-Hop Retrieval for advanced quiz questions
- **Phase 3**: Relationship Mastery Tracking (personalized learning)
- **Phase 4**: Full implementation with all 10 tasks

---

**Happy Testing!** 🚀

If you encounter any issues, just let me know the console error messages and I'll help debug!
