/**
 * Sankey Flow Visualization for Concept Maps
 * Beautiful flowing ribbons showing information flow between concepts
 */

import { useState, useEffect, useRef } from "react";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
} from "../lib/concept-map-generator";
import { Search, Download, Info } from "lucide-react";

interface ConceptMapSankeyProps {
  data: ConceptMapData;
  documentTitle?: string;
}

interface SankeyNode extends ConceptNode {
  x: number;
  y: number;
  height: number;
  layer: number;
}

interface SankeyLink {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  label: string;
  y0: number;
  y1: number;
}

export function ConceptMapSankey({ data, documentTitle }: ConceptMapSankeyProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<SankeyNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - 100,
        height: window.innerHeight - 200,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build Sankey layout
  const buildSankeyLayout = (): { nodes: SankeyNode[], links: SankeyLink[] } => {
    const nodeMap = new Map<string, SankeyNode>();
    const layers = new Map<number, ConceptNode[]>();
    
    // Calculate layers using longest path from sources
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    
    data.nodes.forEach(node => {
      inDegree.set(node.id, 0);
      outDegree.set(node.id, 0);
    });
    
    data.edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    });
    
    // Find source nodes (no incoming edges or high outgoing)
    const sources = data.nodes.filter(node => 
      (inDegree.get(node.id) || 0) === 0 || 
      (outDegree.get(node.id) || 0) > (inDegree.get(node.id) || 0)
    );
    
    // Assign layers using BFS
    const visited = new Set<string>();
    const queue: { node: ConceptNode, layer: number }[] = sources.map(node => ({ node, layer: 0 }));
    let maxLayer = 0;
    
    while (queue.length > 0) {
      const { node, layer } = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      
      if (!layers.has(layer)) layers.set(layer, []);
      layers.get(layer)!.push(node);
      maxLayer = Math.max(maxLayer, layer);
      
      // Add children to next layer
      data.edges
        .filter(e => e.source === node.id)
        .forEach(edge => {
          const target = data.nodes.find(n => n.id === edge.target);
          if (target && !visited.has(target.id)) {
            queue.push({ node: target, layer: layer + 1 });
          }
        });
    }
    
    // Add unvisited nodes to appropriate layers
    data.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const layer = Math.floor(Math.random() * (maxLayer + 1));
        if (!layers.has(layer)) layers.set(layer, []);
        layers.get(layer)!.push(node);
      }
    });
    
    const numLayers = maxLayer + 1;
    const layerWidth = (dimensions.width - 200) / (numLayers || 1);
    const padding = 60;
    
    // Position nodes
    const sankeyNodes: SankeyNode[] = [];
    layers.forEach((layerNodes, layerIndex) => {
      const layerHeight = dimensions.height - 2 * padding;
      const nodeHeight = Math.max(40, Math.min(80, layerHeight / (layerNodes.length + 1)));
      const spacing = (layerHeight - nodeHeight * layerNodes.length) / (layerNodes.length + 1);
      
      layerNodes.forEach((node, nodeIndex) => {
        const x = 100 + layerIndex * layerWidth;
        const y = padding + spacing + nodeIndex * (nodeHeight + spacing);
        
        const sankeyNode: SankeyNode = {
          ...node,
          x,
          y,
          height: nodeHeight,
          layer: layerIndex,
        };
        sankeyNodes.push(sankeyNode);
        nodeMap.set(node.id, sankeyNode);
      });
    });
    
    // Create links
    const sankeyLinks: SankeyLink[] = [];
    data.edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      
      if (source && target) {
        sankeyLinks.push({
          source,
          target,
          value: 1,
          label: edge.label,
          y0: source.y + source.height / 2,
          y1: target.y + target.height / 2,
        });
      }
    });
    
    return { nodes: sankeyNodes, links: sankeyLinks };
  };

  const { nodes: sankeyNodes, links: sankeyLinks } = buildSankeyLayout();

  // Filter by search
  const filteredNodes = sankeyNodes.filter(node =>
    !searchQuery || 
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

  const handleExport = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `concept-map-sankey-${documentTitle || 'graph'}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-panel border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400/50"
          />
        </div>

        <button 
          onClick={handleExport} 
          className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          title="Export SVG"
        >
          <Download className="w-4 h-4 text-white" />
        </button>

        <div className="glass-panel rounded-lg px-3 py-2 text-xs text-white/80 flex items-center gap-2">
          <Info className="w-3 h-3" />
          <span>Flow direction: Left to Right</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full h-full overflow-auto pt-16 pb-20">
        <svg 
          ref={svgRef}
          width={dimensions.width} 
          height={dimensions.height}
          className="mx-auto"
        >
          <defs>
            {/* Gradients for links */}
            {sankeyLinks.map((link, i) => (
              <linearGradient 
                key={`gradient-${i}`} 
                id={`link-gradient-${i}`}
                x1="0%" 
                y1="0%" 
                x2="100%" 
                y2="0%"
              >
                <stop offset="0%" stopColor={getNodeColor(link.source.type)} stopOpacity={0.6} />
                <stop offset="100%" stopColor={getNodeColor(link.target.type)} stopOpacity={0.6} />
              </linearGradient>
            ))}
            
            {/* Glow filters */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Links (curved ribbons) */}
          {sankeyLinks.map((link, i) => {
            const isHighlighted = 
              hoveredNode?.id === link.source.id || 
              hoveredNode?.id === link.target.id ||
              selectedNode === link.source.id ||
              selectedNode === link.target.id ||
              hoveredLink === link;
            
            const isFiltered = searchQuery && 
              (!filteredNodeIds.has(link.source.id) && !filteredNodeIds.has(link.target.id));

            if (isFiltered) return null;

            const path = createCurvedPath(
              link.source.x + 180,
              link.y0,
              link.target.x,
              link.y1,
              15
            );

            return (
              <g key={`link-${i}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={`url(#link-gradient-${i})`}
                  strokeWidth={isHighlighted ? 4 : 2}
                  opacity={isHighlighted ? 1 : 0.4}
                  filter={isHighlighted ? "url(#glow)" : undefined}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredLink(link)}
                  onMouseLeave={() => setHoveredLink(null)}
                />
                {isHighlighted && (
                  <text
                    x={(link.source.x + link.target.x) / 2 + 90}
                    y={(link.y0 + link.y1) / 2 - 5}
                    fill="#A78BFA"
                    fontSize="11"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {link.label.replace(/_/g, ' ')}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {sankeyNodes.map((node) => {
            const isSearchMatch = searchQuery && filteredNodeIds.has(node.id);
            const isSelected = selectedNode === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isFiltered = searchQuery && !isSearchMatch;

            if (isFiltered) return null;

            return (
              <g 
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                className="cursor-pointer"
              >
                {/* Node background */}
                <rect
                  width={180}
                  height={node.height}
                  rx={12}
                  fill={getNodeColor(node.type) + '30'}
                  stroke={getNodeColor(node.type)}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5}
                  filter={isHovered || isSelected ? "url(#glow)" : undefined}
                  className="transition-all duration-200"
                  opacity={isSearchMatch ? 1 : 0.9}
                />
                
                {/* Icon */}
                <text
                  x={12}
                  y={node.height / 2}
                  dominantBaseline="middle"
                  fontSize="20"
                  className="pointer-events-none"
                >
                  {getNodeIcon(node.type)}
                </text>
                
                {/* Label */}
                <text
                  x={38}
                  y={node.height / 2 - (node.height > 50 ? 8 : 0)}
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="13"
                  fontWeight="500"
                  className="pointer-events-none"
                >
                  {node.label.length > 18 ? node.label.slice(0, 18) + '...' : node.label}
                </text>
                
                {/* Type badge */}
                {node.height > 50 && (
                  <text
                    x={38}
                    y={node.height / 2 + 12}
                    dominantBaseline="middle"
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize="9"
                    className="pointer-events-none"
                  >
                    {node.type}
                  </text>
                )}

                {/* Search highlight ring */}
                {isSearchMatch && (
                  <rect
                    width={180}
                    height={node.height}
                    rx={12}
                    fill="none"
                    stroke="#FCD34D"
                    strokeWidth={2}
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 right-4 glass-panel-strong rounded-2xl p-5 z-50 max-w-2xl pointer-events-none shadow-2xl">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ 
                backgroundColor: getNodeColor(hoveredNode.type) + '20', 
                border: `2px solid ${getNodeColor(hoveredNode.type)}40` 
              }}
            >
              {getNodeIcon(hoveredNode.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-white text-lg">{hoveredNode.label}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  Layer {hoveredNode.layer + 1}
                </span>
              </div>
              <p className="text-sm text-white/90 mb-2">{hoveredNode.definition}</p>
              {hoveredNode.role && (
                <p className="text-sm text-purple-300">
                  <span className="text-white/60">Role:</span> {hoveredNode.role}
                </p>
              )}
              {hoveredNode.metrics && Object.keys(hoveredNode.metrics).length > 0 && (
                <div className="mt-3 p-3 bg-gradient-to-br from-orange-500/10 to-purple-500/10 rounded-lg border border-orange-400/30">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(hoveredNode.metrics).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-white/60 text-xs">{key}:</span>{' '}
                        <span className="text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Tooltip */}
      {hoveredLink && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass-panel-strong rounded-xl p-4 z-50 max-w-md pointer-events-none">
          <div className="text-sm">
            <span className="text-white/80">{hoveredLink.source.label}</span>
            <span className="text-purple-300 mx-2">→</span>
            <span className="text-white/80">{hoveredLink.target.label}</span>
          </div>
          <div className="mt-2 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 inline-block">
            {hoveredLink.label.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {data.nodes.length} concepts • {data.edges.length} flows
      </div>
    </div>
  );
}

// Helper function to create curved path
function createCurvedPath(x1: number, y1: number, x2: number, y2: number, thickness: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}
