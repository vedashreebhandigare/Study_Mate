/**
 * Robust JSON Parser for Gemini API Responses
 * Handles malformed JSON with multiple fallback strategies
 */

import { ConceptNode, ConceptEdge, ConceptMapData, NodeType } from './concept-map-generator';

/**
 * Extract and clean JSON from AI response with multiple strategies
 * Internal function - use parseConceptMapJSON() instead
 */
function extractAndCleanJSON(text: string): string {
  console.log("📝 Extracting JSON from response (length: " + text.length + ")");
  
  // Strategy 1: Remove markdown code blocks
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  
  // Strategy 2: Try to find JSON object with "nodes" and "edges" keys using greedy match
  const jsonObjectMatch = cleaned.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
  if (jsonObjectMatch) {
    cleaned = jsonObjectMatch[0];
    console.log("✅ Found JSON using pattern matching");
  } else {
    // Strategy 3: Find the first { and last } to extract just the JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      console.error("❌ No braces found in response");
      console.log("📄 Response preview: " + text.substring(0, 500));
      throw new Error("No valid JSON object found in response");
    }
    
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    console.log("✅ Extracted JSON using brace matching");
  }
  
  // Fix common JSON issues
  // 1. Remove trailing commas before ] or }
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  // 2. Fix unescaped newlines in strings (simple approach)
  cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"');
  
  // 3. Fix unescaped tabs
  cleaned = cleaned.replace(/"([^"]*)\t([^"]*)"/g, '"$1\\t$2"');
  
  console.log("📄 Cleaned JSON (first 200 chars): " + cleaned.substring(0, 200));
  
  return cleaned;
}

/**
 * Advanced JSON repair using regex extraction
 * Internal function - use parseConceptMapJSON() instead
 */
function repairJSON(jsonString: string): ConceptMapData {
  console.log("🔧 Attempting to repair malformed JSON...");
  
  try {
    const nodes: ConceptNode[] = [];
    const edges: ConceptEdge[] = [];
    
    // Try multiple patterns to extract nodes array
    let nodesMatch = jsonString.match(/"nodes"\s*:\s*\[([\s\S]*?)\]\s*,?\s*"edges"/);
    
    // Alternative pattern if first fails
    if (!nodesMatch) {
      nodesMatch = jsonString.match(/"nodes"\s*:\s*\[([\s\S]*?)\]/);
    }
    
    if (!nodesMatch) {
      console.error("❌ Could not find nodes array with any pattern");
      console.log("📄 JSON string preview:", jsonString.substring(0, 500));
      throw new Error("Could not extract nodes array");
    }
    
    // Try multiple patterns to extract edges array
    let edgesMatch = jsonString.match(/"edges"\s*:\s*\[([\s\S]*?)\]\s*\}/);
    
    // Alternative pattern if first fails
    if (!edgesMatch) {
      edgesMatch = jsonString.match(/"edges"\s*:\s*\[([\s\S]*?)\]/);
    }
    
    console.log("✅ Found nodes and edges arrays");
    
    // Parse nodes with VERY flexible pattern - match any valid node structure
    // This pattern looks for id, label, type, and definition in any order
    const nodeObjects = nodesMatch[1].split(/\},\s*\{/).map(obj => {
      // Add braces back if they were split off
      if (!obj.trim().startsWith('{')) obj = '{' + obj;
      if (!obj.trim().endsWith('}')) obj = obj + '}';
      return obj;
    });
    
    for (const nodeStr of nodeObjects) {
      try {
        // Extract individual fields with flexible patterns
        const idMatch = nodeStr.match(/"id"\s*:\s*"([^"]+)"/);
        const labelMatch = nodeStr.match(/"label"\s*:\s*"([^"]+)"/);
        const typeMatch = nodeStr.match(/"type"\s*:\s*"([^"]+)"/);
        const definitionMatch = nodeStr.match(/"definition"\s*:\s*"([^"]*)"/);
        const roleMatch = nodeStr.match(/"role"\s*:\s*"([^"]*)"/);
        const categoryMatch = nodeStr.match(/"category"\s*:\s*"([^"]*)"/);
        
        if (idMatch && labelMatch && typeMatch) {
          const node: ConceptNode = {
            id: idMatch[1],
            label: labelMatch[1],
            type: typeMatch[1] as NodeType,
            definition: definitionMatch ? definitionMatch[1] : "No definition available"
          };
          
          if (roleMatch && roleMatch[1]) {
            node.role = roleMatch[1];
          }
          
          if (categoryMatch && categoryMatch[1]) {
            node.category = categoryMatch[1] as any;
          }
          
          // Try to extract metrics if present
          const metricsMatch = nodeStr.match(/"metrics"\s*:\s*\{([^}]*)\}/);
          if (metricsMatch) {
            const metricsObj: { [key: string]: string | number } = {};
            const metricPairs = metricsMatch[1].match(/"([^"]+)"\s*:\s*"?([^",}]+)"?/g);
            if (metricPairs) {
              metricPairs.forEach(pair => {
                const [key, value] = pair.split(':').map(s => s.trim().replace(/"/g, ''));
                metricsObj[key] = value;
              });
              node.metrics = metricsObj;
            }
          }
          
          nodes.push(node);
        }
      } catch (nodeError) {
        console.warn("⚠️ Skipping malformed node:", nodeError);
      }
    }
    
    console.log(`✅ Extracted ${nodes.length} nodes`);
    
    // Parse edges with flexible pattern
    if (edgesMatch) {
      const edgeObjects = edgesMatch[1].split(/\},\s*\{/).map(obj => {
        if (!obj.trim().startsWith('{')) obj = '{' + obj;
        if (!obj.trim().endsWith('}')) obj = obj + '}';
        return obj;
      });
      
      for (const edgeStr of edgeObjects) {
        try {
          const sourceMatch = edgeStr.match(/"source"\s*:\s*"([^"]+)"/);
          const targetMatch = edgeStr.match(/"target"\s*:\s*"([^"]+)"/);
          const labelMatch = edgeStr.match(/"label"\s*:\s*"([^"]+)"/);
          const descMatch = edgeStr.match(/"description"\s*:\s*"([^"]*)"/);
          
          if (sourceMatch && targetMatch && labelMatch) {
            const edge: ConceptEdge = {
              source: sourceMatch[1],
              target: targetMatch[1],
              label: labelMatch[1]
            };
            
            if (descMatch && descMatch[1]) {
              edge.description = descMatch[1];
            }
            
            edges.push(edge);
          }
        } catch (edgeError) {
          console.warn("⚠️ Skipping malformed edge:", edgeError);
        }
      }
    }
    
    console.log(`✅ Extracted ${edges.length} edges`);
    
    if (nodes.length === 0) {
      throw new Error("No valid nodes found after repair");
    }
    
    return { nodes, edges };
  } catch (error: any) {
    console.error("❌ Failed to repair JSON:", error);
    throw new Error("Could not repair malformed JSON response: " + error.message);
  }
}

/**
 * Simplified JSON extraction as last resort
 * Looks for basic node and edge structures
 * Internal function - use parseConceptMapJSON() instead
 */
function extractMinimalJSON(text: string): ConceptMapData {
  console.log("🆘 Attempting minimal JSON extraction...");
  
  const nodes: ConceptNode[] = [];
  const edges: ConceptEdge[] = [];
  const seenNodeIds = new Set<string>();
  
  // Strategy 1: Look for complete node objects with all fields
  const completeNodePattern = /"id"\s*:\s*"([^"]+)"[\s\S]{0,800}?"label"\s*:\s*"([^"]+)"[\s\S]{0,800}?"type"\s*:\s*"([^"]+)"[\s\S]{0,800}?"definition"\s*:\s*"([^"]*)"/g;
  
  for (const match of text.matchAll(completeNodePattern)) {
    const id = match[1];
    if (!seenNodeIds.has(id)) {
      seenNodeIds.add(id);
      
      const node: ConceptNode = {
        id: id,
        label: match[2],
        type: match[3] as NodeType,
        definition: match[4] || "Concept from document"
      };
      
      // Try to find role for this node
      const rolePattern = new RegExp(`"id"\\s*:\\s*"${id}"[\\s\\S]{0,600}?"role"\\s*:\\s*"([^"]*)"`, 'i');
      const roleMatch = text.match(rolePattern);
      if (roleMatch && roleMatch[1]) {
        node.role = roleMatch[1];
      }
      
      // Try to find category for this node
      const categoryPattern = new RegExp(`"id"\\s*:\\s*"${id}"[\\s\\S]{0,600}?"category"\\s*:\\s*"([^"]*)"`, 'i');
      const categoryMatch = text.match(categoryPattern);
      if (categoryMatch && categoryMatch[1]) {
        node.category = categoryMatch[1] as any;
      }
      
      nodes.push(node);
    }
  }
  
  // Strategy 2: If we didn't get enough nodes, try alternate patterns
  if (nodes.length < 5) {
    console.log("🔍 Trying alternate node extraction patterns...");
    
    // Try finding nodes with fields in different order
    const altNodePattern = /"label"\s*:\s*"([^"]+)"[\s\S]{0,600}?"id"\s*:\s*"([^"]+)"[\s\S]{0,600}?"type"\s*:\s*"([^"]+)"/g;
    
    for (const match of text.matchAll(altNodePattern)) {
      const id = match[2];
      if (!seenNodeIds.has(id)) {
        seenNodeIds.add(id);
        nodes.push({
          id: id,
          label: match[1],
          type: match[3] as NodeType,
          definition: "Concept from document"
        });
      }
    }
  }
  
  console.log(`✅ Found ${nodes.length} nodes via minimal extraction`);
  
  // Extract edges
  const edgePattern = /"source"\s*:\s*"([^"]+)"[\s\S]{0,300}?"target"\s*:\s*"([^"]+)"[\s\S]{0,300}?"label"\s*:\s*"([^"]+)"/g;
  
  for (const match of text.matchAll(edgePattern)) {
    const edge: ConceptEdge = {
      source: match[1],
      target: match[2],
      label: match[3]
    };
    
    // Try to find description
    const edgeDescPattern = new RegExp(
      `"source"\\s*:\\s*"${match[1]}"[\\s\\S]{0,400}?"target"\\s*:\\s*"${match[2]}"[\\s\\S]{0,400}?"description"\\s*:\\s*"([^"]*)"`,
      'i'
    );
    const descMatch = text.match(edgeDescPattern);
    if (descMatch && descMatch[1]) {
      edge.description = descMatch[1];
    }
    
    edges.push(edge);
  }
  
  console.log(`🆘 Minimal extraction complete: ${nodes.length} nodes, ${edges.length} edges`);
  
  if (nodes.length === 0) {
    throw new Error("Could not extract any nodes from response");
  }
  
  return { nodes, edges };
}

/**
 * Main parsing function with multiple fallback strategies
 */
export function parseConceptMapJSON(text: string): ConceptMapData {
  console.log("🔍 Parsing concept map JSON with fallback strategies...");
  console.log("📏 Response length:", text.length, "characters");
  
  try {
    // Strategy 1: Clean and parse directly
    const cleaned = extractAndCleanJSON(text);
    try {
      const parsed = JSON.parse(cleaned);
      console.log("✅ Strategy 1 SUCCESS: Direct JSON parse");
      console.log(`📊 Parsed: ${parsed.nodes?.length || 0} nodes, ${parsed.edges?.length || 0} edges`);
      return parsed as ConceptMapData;
    } catch (parseError: any) {
      console.warn("⚠️ Strategy 1 FAILED: Direct parse failed -", parseError.message);
      console.log("🔧 Trying repair...");
      
      // Strategy 2: Try to repair the JSON
      try {
        const repaired = repairJSON(cleaned);
        console.log("✅ Strategy 2 SUCCESS: Repaired JSON");
        console.log(`📊 Repaired: ${repaired.nodes?.length || 0} nodes, ${repaired.edges?.length || 0} edges`);
        return repaired;
      } catch (repairError: any) {
        console.warn("⚠️ Strategy 2 FAILED: Repair failed -", repairError.message);
        console.log("🆘 Trying minimal extraction...");
        
        // Strategy 3: Minimal extraction
        try {
          const minimal = extractMinimalJSON(text);
          console.log("✅ Strategy 3 SUCCESS: Minimal extraction");
          console.log(`📊 Extracted: ${minimal.nodes?.length || 0} nodes, ${minimal.edges?.length || 0} edges`);
          return minimal;
        } catch (minimalError: any) {
          console.error("❌ All parsing strategies failed");
          console.error("Strategy 1 error:", parseError.message);
          console.error("Strategy 2 error:", repairError.message);
          console.error("Strategy 3 error:", minimalError.message);
          throw new Error(`Failed to parse concept map after all strategies. Last error: ${minimalError.message}`);
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Fatal parsing error:", error.message);
    // Log the actual response for debugging (first and last parts)
    console.log("📄 Response START (500 chars):", text.substring(0, 500));
    console.log("📄 Response END (500 chars):", text.substring(Math.max(0, text.length - 500)));
    throw error;
  }
}

/**
 * Generic JSON parser for any AI response (not just concept maps)
 * Uses similar robust parsing strategies
 */
export function parseJSONResponse(text: string): any {
  console.log("🔍 Parsing generic JSON response...");
  
  try {
    // Remove markdown code blocks
    let cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    
    // Try to find JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    // Fix common JSON issues
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
    
    // Try to parse
    try {
      const parsed = JSON.parse(cleaned);
      console.log("✅ Successfully parsed generic JSON");
      return parsed;
    } catch (parseError: any) {
      console.warn("⚠️ Direct parse failed, trying repair...", parseError.message);
      
      // Try more aggressive cleaning
      cleaned = cleaned
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/  +/g, ' ');
      
      const parsed = JSON.parse(cleaned);
      console.log("✅ Successfully parsed after aggressive cleaning");
      return parsed;
    }
  } catch (error: any) {
    console.error("❌ Failed to parse JSON response:", error.message);
    console.log("📄 Response preview:", text.substring(0, 500));
    return null;
  }
}
