/**
 * Cluster Bubble Visualization for Concept Maps
 * Clean bubble packs grouped by category/type with glassmorphic styling
 */

import { useState, useRef, useEffect } from "react";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
  getCategoryColor,
} from "../lib/concept-map-generator";
import { Search, Download, Info, Maximize2, ZoomIn, ZoomOut } from "lucide-react";

interface ConceptMapClusterProps {
  data: ConceptMapData;
  documentTitle?: string;
}

export function ConceptMapCluster({ data, documentTitle }: ConceptMapClusterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
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

  // Group nodes by type
  const nodesByType = new Map<string, ConceptNode[]>();
  data.nodes.forEach(node => {
    if (!nodesByType.has(node.type)) {
      nodesByType.set(node.type, []);
    }
    nodesByType.get(node.type)!.push(node);
  });

  const types = Array.from(nodesByType.keys());
  const clusterRadius = 180;
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  // Position cluster centers in a circle
  const clusterCenters = types.map((type, index) => {
    const angle = (index / types.length) * 2 * Math.PI - Math.PI / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.32;
    return {
      type,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  // Position nodes within their clusters
  const positionedNodes: Array<ConceptNode & { x: number; y: number; size: number }> = [];
  
  clusterCenters.forEach(cluster => {
    const clusterNodes = nodesByType.get(cluster.type) || [];
    const numNodes = clusterNodes.length;
    
    clusterNodes.forEach((node, index) => {
      // Spiral arrangement within cluster
      const t = index / Math.max(numNodes - 1, 1);
      const spiralAngle = t * Math.PI * 4;
      const spiralRadius = t * (clusterRadius - 40);
      
      const x = cluster.x + spiralRadius * Math.cos(spiralAngle);
      const y = cluster.y + spiralRadius * Math.sin(spiralAngle);
      
      // Calculate node size based on connections
      const connections = data.edges.filter(
        e => e.source === node.id || e.target === node.id
      ).length;
      const size = 25 + Math.min(connections * 3, 30);
      
      positionedNodes.push({ ...node, x, y, size });
    });
  });

  const nodeMap = new Map(positionedNodes.map(n => [n.id, n]));

  // Filter by search
  const filteredNodes = positionedNodes.filter(node =>
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
    link.download = `concept-map-cluster-${documentTitle || 'graph'}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3">
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

        <div className="flex gap-2">
          <button 
            onClick={() => setScale(s => Math.min(s + 0.2, 2))} 
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <button 
            onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} 
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <button 
            onClick={() => setScale(1)} 
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        </div>

        <button 
          onClick={handleExport} 
          className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          title="Export SVG"
        >
          <Download className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* SVG Canvas */}
      <div className="w-full h-full flex items-center justify-center overflow-auto pt-16 pb-20">
        <svg 
          ref={svgRef}
          width={dimensions.width} 
          height={dimensions.height}
          className="transition-all duration-500"
          style={{ transform: `scale(${scale})` }}
        >
          <defs>
            {/* Cluster gradients */}
            {clusterCenters.map((cluster, i) => (
              <radialGradient 
                key={`cluster-gradient-${i}`} 
                id={`cluster-gradient-${cluster.type}`}
              >
                <stop offset="0%" stopColor={getNodeColor(cluster.type as any)} stopOpacity={0.15} />
                <stop offset="100%" stopColor={getNodeColor(cluster.type as any)} stopOpacity={0} />
              </radialGradient>
            ))}

            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Cluster backgrounds */}
          {clusterCenters.map((cluster) => (
            <g key={`cluster-bg-${cluster.type}`}>
              <circle
                cx={cluster.x}
                cy={cluster.y}
                r={clusterRadius}
                fill={`url(#cluster-gradient-${cluster.type})`}
              />
              <circle
                cx={cluster.x}
                cy={cluster.y}
                r={clusterRadius}
                fill="none"
                stroke={getNodeColor(cluster.type as any)}
                strokeWidth={2}
                strokeDasharray="5,5"
                opacity={0.3}
              />
            </g>
          ))}

          {/* Cluster labels */}
          {clusterCenters.map((cluster) => (
            <g key={`cluster-label-${cluster.type}`}>
              <text
                x={cluster.x}
                y={cluster.y - clusterRadius - 15}
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="600"
              >
                {cluster.type.toUpperCase()}
              </text>
              <text
                x={cluster.x}
                y={cluster.y - clusterRadius + 2}
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.5)"
                fontSize="12"
              >
                {nodesByType.get(cluster.type)?.length || 0} concepts
              </text>
            </g>
          ))}

          {/* Connection lines (subtle) */}
          {data.edges.map((edge, i) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;

            const isHighlighted = 
              hoveredNode?.id === source.id || 
              hoveredNode?.id === target.id ||
              selectedNode === source.id ||
              selectedNode === target.id;
            
            const isFiltered = searchQuery && 
              (!filteredNodeIds.has(source.id) && !filteredNodeIds.has(target.id));

            if (isFiltered) return null;

            return (
              <line
                key={`edge-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isHighlighted ? getNodeColor(source.type) : 'rgba(168, 85, 247, 0.2)'}
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={isHighlighted ? 0.6 : 0.2}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Nodes */}
          {positionedNodes.map((node) => {
            const isSearchMatch = searchQuery && filteredNodeIds.has(node.id);
            const isSelected = selectedNode === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isFiltered = searchQuery && !isSearchMatch;

            if (isFiltered) return null;

            return (
              <g 
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size}
                  fill={getNodeColor(node.type) + '40'}
                  stroke={getNodeColor(node.type)}
                  strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                  filter={isHovered || isSelected ? "url(#glow)" : undefined}
                  className="transition-all duration-200"
                />

                {/* Icon */}
                <text
                  x={node.x}
                  y={node.y}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize={node.size > 35 ? "18" : "14"}
                  className="pointer-events-none"
                >
                  {getNodeIcon(node.type)}
                </text>

                {/* Label (only for larger nodes or hovered) */}
                {(node.size > 40 || isHovered || isSelected) && (
                  <text
                    x={node.x}
                    y={node.y + node.size + 14}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight={isHovered || isSelected ? '600' : '400'}
                    className="pointer-events-none"
                  >
                    {node.label.length > 15 ? node.label.slice(0, 15) + '...' : node.label}
                  </text>
                )}

                {/* Search highlight */}
                {isSearchMatch && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 4}
                    fill="none"
                    stroke="#FCD34D"
                    strokeWidth={2}
                    className="animate-pulse"
                  />
                )}

                {/* Connection count badge */}
                {node.size > 40 && (
                  <g>
                    <circle
                      cx={node.x + node.size - 8}
                      cy={node.y - node.size + 8}
                      r={10}
                      fill="rgba(0, 0, 0, 0.6)"
                      stroke={getNodeColor(node.type)}
                      strokeWidth={1.5}
                    />
                    <text
                      x={node.x + node.size - 8}
                      y={node.y - node.size + 8}
                      dominantBaseline="middle"
                      textAnchor="middle"
                      fill="white"
                      fontSize="9"
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {data.edges.filter(e => e.source === node.id || e.target === node.id).length}
                    </text>
                  </g>
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
                  {hoveredNode.type}
                </span>
              </div>
              <p className="text-sm text-white/90 mb-2">{hoveredNode.definition}</p>
              {hoveredNode.role && (
                <p className="text-sm text-purple-300">
                  <span className="text-white/60">Role:</span> {hoveredNode.role}
                </p>
              )}
              {hoveredNode.category && (
                <p className="text-sm text-cyan-300 mt-2">
                  <span className="text-white/60">Category:</span> {hoveredNode.category}
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

      {/* Legend */}
      <div className="absolute top-4 right-4 glass-panel-strong rounded-xl p-4 max-w-xs z-10">
        <div className="text-sm text-white/90 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>Cluster Bubbles</span>
        </div>
        <div className="text-xs text-white/70 space-y-1 mb-3">
          <div>• Grouped by concept type</div>
          <div>• Bubble size = # of connections</div>
          <div>• Badge shows connection count</div>
          <div>• Click to highlight relationships</div>
        </div>
        
        <div className="space-y-1.5">
          {types.map(type => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getNodeColor(type as any) }}
              />
              <span className="text-xs text-white/80">{type}</span>
              <span className="text-xs text-white/50 ml-auto">
                {nodesByType.get(type)?.length || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {data.nodes.length} concepts • {types.length} clusters
      </div>
    </div>
  );
}
