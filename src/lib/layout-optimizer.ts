/**
 * Universal Layout Optimizer for Concept Map Visualizations
 * 
 * Provides intelligent layout calculations and recommendations
 * for all 9 visualization types to ensure optimal rendering
 * regardless of graph size, complexity, or screen dimensions.
 */

export type LayoutType = 
  | 'force' 
  | 'sankey' 
  | 'circular' 
  | 'timeline' 
  | 'hierarchical' 
  | 'radial' 
  | 'grid' 
  | 'matrix' 
  | 'cluster';

export type GraphDensity = 'sparse' | 'medium' | 'dense' | 'very-dense';

export interface GraphAnalysis {
  nodeCount: number;
  edgeCount: number;
  density: GraphDensity;
  avgDegree: number;
  maxDegree: number;
  isTree: boolean;
  isCyclic: boolean;
  clusterCount: number;
}

export interface LayoutDimensions {
  width: number;
  height: number;
  nodeSize: number;
  spacing: number;
  fontSize: number;
  strokeWidth: number;
}

export interface OptimalSettings {
  zoom: number;
  dimensions: LayoutDimensions;
  shouldCluster: boolean;
  shouldBundleEdges: boolean;
  shouldShowAllEdges: boolean;
  recommendedLayout: LayoutType;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
}

/**
 * Analyzes graph structure and returns detailed metrics
 */
export function analyzeGraph(
  nodes: any[],
  edges: any[]
): GraphAnalysis {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  // Calculate degree information
  const degreeMap = new Map<string, number>();
  nodes.forEach(node => degreeMap.set(node.id, 0));
  
  edges.forEach(edge => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  });

  const degrees = Array.from(degreeMap.values());
  const avgDegree = degrees.reduce((a, b) => a + b, 0) / nodeCount;
  const maxDegree = Math.max(...degrees);

  // Calculate density (edges / possible edges)
  const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
  const densityRatio = edgeCount / maxPossibleEdges;

  let density: GraphDensity;
  if (densityRatio < 0.1) density = 'sparse';
  else if (densityRatio < 0.3) density = 'medium';
  else if (densityRatio < 0.6) density = 'dense';
  else density = 'very-dense';

  // Check if tree (edges = nodes - 1 and connected)
  const isTree = edgeCount === nodeCount - 1;

  // Simple cycle detection (if edges > nodes - 1)
  const isCyclic = edgeCount > nodeCount - 1;

  // Estimate cluster count (very simple heuristic)
  const clusterCount = Math.ceil(nodeCount / 10);

  return {
    nodeCount,
    edgeCount,
    density,
    avgDegree,
    maxDegree,
    isTree,
    isCyclic,
    clusterCount,
  };
}

/**
 * Calculates optimal zoom level for the graph
 */
export function calculateOptimalZoom(
  nodeCount: number,
  edgeCount: number,
  screenWidth: number,
  screenHeight: number,
  layoutType: LayoutType
): number {
  // Base zoom on node count
  let zoom = 1.0;

  if (nodeCount <= 5) {
    zoom = 1.2; // Zoom in for small graphs
  } else if (nodeCount <= 10) {
    zoom = 1.0;
  } else if (nodeCount <= 20) {
    zoom = 0.85;
  } else if (nodeCount <= 40) {
    zoom = 0.7;
  } else {
    zoom = 0.6;
  }

  // Adjust for layout type
  const layoutZoomFactors: Record<LayoutType, number> = {
    force: 1.0,
    circular: 0.9, // Needs more space for circular layout
    radial: 0.9,
    hierarchical: 0.85, // Vertical layouts need more height
    timeline: 1.0,
    sankey: 0.95,
    grid: 1.0,
    matrix: 1.1, // Can be more compact
    cluster: 0.9,
  };

  zoom *= layoutZoomFactors[layoutType];

  // Adjust for screen size
  const avgScreenDimension = (screenWidth + screenHeight) / 2;
  if (avgScreenDimension < 800) {
    zoom *= 0.8; // Mobile
  } else if (avgScreenDimension > 1600) {
    zoom *= 1.1; // Large desktop
  }

  // Clamp zoom
  return Math.max(0.3, Math.min(2.0, zoom));
}

/**
 * Calculates optimal spacing between nodes
 */
export function calculateOptimalSpacing(
  nodeCount: number,
  layoutType: LayoutType,
  screenWidth: number
): number {
  let baseSpacing = 100;

  // Adjust for node count
  if (nodeCount <= 5) baseSpacing = 150;
  else if (nodeCount <= 10) baseSpacing = 120;
  else if (nodeCount <= 20) baseSpacing = 100;
  else if (nodeCount <= 40) baseSpacing = 80;
  else baseSpacing = 60;

  // Layout-specific adjustments
  const layoutSpacingFactors: Record<LayoutType, number> = {
    force: 1.2,
    circular: 1.0,
    radial: 1.1,
    hierarchical: 1.3,
    timeline: 1.5,
    sankey: 1.4,
    grid: 1.0,
    matrix: 0.5,
    cluster: 1.2,
  };

  baseSpacing *= layoutSpacingFactors[layoutType];

  // Adjust for screen width
  if (screenWidth < 768) {
    baseSpacing *= 0.7;
  } else if (screenWidth > 1920) {
    baseSpacing *= 1.2;
  }

  return baseSpacing;
}

/**
 * Calculates responsive dimensions for nodes and text
 */
export function calculateResponsiveDimensions(
  nodeCount: number,
  screenWidth: number,
  screenHeight: number,
  layoutType: LayoutType
): LayoutDimensions {
  const spacing = calculateOptimalSpacing(nodeCount, layoutType, screenWidth);

  // Node size based on count and screen
  let nodeSize = 40;
  if (nodeCount <= 10) nodeSize = 50;
  else if (nodeCount <= 20) nodeSize = 40;
  else if (nodeCount <= 40) nodeSize = 35;
  else nodeSize = 30;

  // Adjust for mobile
  if (screenWidth < 768) {
    nodeSize *= 0.8;
  }

  // Font size
  const fontSize = Math.max(10, Math.min(14, nodeSize * 0.3));

  // Stroke width
  const strokeWidth = nodeCount > 30 ? 1.5 : 2;

  return {
    width: screenWidth,
    height: screenHeight,
    nodeSize,
    spacing,
    fontSize,
    strokeWidth,
  };
}

/**
 * Determines if edges should be bundled to reduce visual clutter
 */
export function shouldBundleEdges(
  edgeCount: number,
  nodeCount: number
): boolean {
  const edgesPerNode = edgeCount / nodeCount;
  return edgesPerNode > 3 || edgeCount > 50;
}

/**
 * Determines if all edges should be shown or hidden by default
 */
export function shouldShowAllEdges(
  edgeCount: number,
  density: GraphDensity
): boolean {
  if (density === 'very-dense') return false;
  if (density === 'dense' && edgeCount > 40) return false;
  return edgeCount <= 30;
}

/**
 * Recommends the best layout for the given graph
 */
export function recommendLayout(analysis: GraphAnalysis): LayoutType {
  const { nodeCount, edgeCount, density, isTree, avgDegree } = analysis;

  // Very small graphs - force is fine
  if (nodeCount <= 5) return 'force';

  // Trees work well with hierarchical
  if (isTree && nodeCount <= 30) return 'hierarchical';

  // Dense graphs
  if (density === 'very-dense') {
    if (nodeCount <= 20) return 'matrix';
    return 'cluster';
  }

  // Medium dense
  if (density === 'dense') {
    if (nodeCount <= 15) return 'circular';
    if (nodeCount <= 30) return 'sankey';
    return 'cluster';
  }

  // Sequential/flow-like (many 1-to-1 connections)
  if (avgDegree < 2.5 && edgeCount > nodeCount * 0.8) {
    return 'timeline';
  }

  // Hub-and-spoke pattern (one node with many connections)
  if (avgDegree < 3) {
    return 'radial';
  }

  // Default for medium graphs
  if (nodeCount <= 15) return 'force';
  if (nodeCount <= 30) return 'grid';

  // Large graphs
  return 'cluster';
}

/**
 * Assesses the rendering quality for the given layout and graph
 */
export function assessLayoutQuality(
  layoutType: LayoutType,
  analysis: GraphAnalysis,
  screenWidth: number
): 'excellent' | 'good' | 'acceptable' | 'poor' {
  const { nodeCount, edgeCount, density } = analysis;
  const recommended = recommendLayout(analysis);

  // Perfect match
  if (layoutType === recommended) return 'excellent';

  // Check if layout can handle the graph well
  const layoutCapabilities: Record<LayoutType, {
    maxNodes: number;
    maxEdges: number;
    preferredDensity: GraphDensity[];
  }> = {
    force: { maxNodes: 30, maxEdges: 60, preferredDensity: ['sparse', 'medium'] },
    circular: { maxNodes: 25, maxEdges: 50, preferredDensity: ['sparse', 'medium', 'dense'] },
    radial: { maxNodes: 40, maxEdges: 80, preferredDensity: ['sparse', 'medium'] },
    hierarchical: { maxNodes: 40, maxEdges: 60, preferredDensity: ['sparse', 'medium'] },
    timeline: { maxNodes: 30, maxEdges: 50, preferredDensity: ['sparse', 'medium'] },
    sankey: { maxNodes: 35, maxEdges: 70, preferredDensity: ['medium', 'dense'] },
    grid: { maxNodes: 50, maxEdges: 100, preferredDensity: ['sparse', 'medium'] },
    matrix: { maxNodes: 30, maxEdges: 200, preferredDensity: ['dense', 'very-dense'] },
    cluster: { maxNodes: 100, maxEdges: 300, preferredDensity: ['medium', 'dense', 'very-dense'] },
  };

  const capability = layoutCapabilities[layoutType];

  // Check constraints
  if (nodeCount > capability.maxNodes * 1.5 || edgeCount > capability.maxEdges * 1.5) {
    return 'poor';
  }

  if (nodeCount > capability.maxNodes || edgeCount > capability.maxEdges) {
    return 'acceptable';
  }

  if (capability.preferredDensity.includes(density)) {
    return 'good';
  }

  return 'acceptable';
}

/**
 * Main function: Get optimal settings for any layout
 */
export function getOptimalSettings(
  nodes: any[],
  edges: any[],
  layoutType: LayoutType,
  screenWidth: number,
  screenHeight: number
): OptimalSettings {
  const analysis = analyzeGraph(nodes, edges);
  const zoom = calculateOptimalZoom(
    analysis.nodeCount,
    analysis.edgeCount,
    screenWidth,
    screenHeight,
    layoutType
  );
  const dimensions = calculateResponsiveDimensions(
    analysis.nodeCount,
    screenWidth,
    screenHeight,
    layoutType
  );

  return {
    zoom,
    dimensions,
    shouldCluster: analysis.nodeCount > 50,
    shouldBundleEdges: shouldBundleEdges(analysis.edgeCount, analysis.nodeCount),
    shouldShowAllEdges: shouldShowAllEdges(analysis.edgeCount, analysis.density),
    recommendedLayout: recommendLayout(analysis),
    quality: assessLayoutQuality(layoutType, analysis, screenWidth),
  };
}

/**
 * Calculate viewport bounds to fit all nodes
 */
export function calculateFitBounds(
  nodes: Array<{ x?: number; y?: number }>,
  padding: number = 50
): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  const positions = nodes.filter(n => n.x !== undefined && n.y !== undefined);
  
  if (positions.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  const xs = positions.map(n => n.x!);
  const ys = positions.map(n => n.y!);

  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate transform to fit bounds in viewport
 */
export function calculateFitTransform(
  bounds: ReturnType<typeof calculateFitBounds>,
  viewportWidth: number,
  viewportHeight: number
): { scale: number; translateX: number; translateY: number } {
  if (bounds.width === 0 || bounds.height === 0) {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  const scaleX = viewportWidth / bounds.width;
  const scaleY = viewportHeight / bounds.height;
  const scale = Math.min(scaleX, scaleY, 2); // Max zoom 2x

  const translateX = (viewportWidth / scale - (bounds.minX + bounds.maxX)) / 2;
  const translateY = (viewportHeight / scale - (bounds.minY + bounds.maxY)) / 2;

  return { scale, translateX, translateY };
}

/**
 * Detects if graph has specific patterns
 */
export function detectGraphPattern(
  nodes: any[],
  edges: any[]
): 'hub-spoke' | 'chain' | 'grid' | 'tree' | 'mesh' | 'cluster' | 'unknown' {
  const analysis = analyzeGraph(nodes, edges);

  // Hub-spoke: one node with many connections
  if (analysis.maxDegree > analysis.nodeCount * 0.5) {
    return 'hub-spoke';
  }

  // Chain: mostly linear connections
  if (analysis.avgDegree < 2.5 && analysis.edgeCount > analysis.nodeCount * 0.7) {
    return 'chain';
  }

  // Tree: hierarchical
  if (analysis.isTree) {
    return 'tree';
  }

  // Dense mesh
  if (analysis.density === 'very-dense') {
    return 'mesh';
  }

  // Multiple disconnected components
  if (analysis.edgeCount < analysis.nodeCount * 0.6) {
    return 'cluster';
  }

  return 'unknown';
}

/**
 * Get human-readable recommendations
 */
export function getLayoutRecommendations(
  nodes: any[],
  edges: any[],
  currentLayout: LayoutType
): string[] {
  const analysis = analyzeGraph(nodes, edges);
  const optimal = getOptimalSettings(nodes, edges, currentLayout, 1920, 1080);
  const pattern = detectGraphPattern(nodes, edges);
  const recommendations: string[] = [];

  if (optimal.quality === 'poor') {
    recommendations.push(`⚠️ Current layout (${currentLayout}) may not display well with ${analysis.nodeCount} nodes`);
    recommendations.push(`✅ Try ${optimal.recommendedLayout} layout instead`);
  }

  if (optimal.quality === 'acceptable') {
    recommendations.push(`💡 ${optimal.recommendedLayout} layout might work better for this graph`);
  }

  if (analysis.density === 'very-dense') {
    recommendations.push(`📊 Dense graph detected - consider Matrix or Cluster view`);
  }

  if (pattern === 'hub-spoke') {
    recommendations.push(`🎯 Hub-and-spoke pattern detected - Radial view recommended`);
  }

  if (pattern === 'chain') {
    recommendations.push(`🔗 Sequential pattern detected - Timeline view recommended`);
  }

  if (pattern === 'tree') {
    recommendations.push(`🌳 Tree structure detected - Hierarchical view recommended`);
  }

  if (!optimal.shouldShowAllEdges) {
    recommendations.push(`👁️ Too many connections - edges hidden by default (toggle to show)`);
  }

  return recommendations;
}
