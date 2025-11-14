/**
 * Timeline Flow Visualization for Concept Maps
 * Horizontal flow chart with glassmorphic cards showing progression
 * OPTIMIZED: Full-width responsive layout with smart connection rendering
 */

import { useState, useRef, useEffect } from "react";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
} from "../lib/concept-map-generator";
import { Search, Download, ChevronRight, Info, ZoomIn, ZoomOut, Maximize2, Network } from "lucide-react";

interface ConceptMapTimelineProps {
  data: ConceptMapData;
  documentTitle?: string;
}

interface TimelineNode extends ConceptNode {
  column: number;
  row: number;
}

export function ConceptMapTimeline({ data, documentTitle }: ConceptMapTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<TimelineNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1400, height: 800 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Math.max(1400, window.innerWidth - 100),
        height: window.innerHeight - 200,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build timeline layout (left to right flow)
  const buildTimelineLayout = (): TimelineNode[] => {
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
    
    // Find source nodes
    const sources = data.nodes.filter(node => 
      (inDegree.get(node.id) || 0) === 0 || 
      (outDegree.get(node.id) || 0) > (inDegree.get(node.id) || 0) * 1.5
    );
    
    // Build columns using BFS
    const columns = new Map<number, ConceptNode[]>();
    const visited = new Set<string>();
    const queue: { node: ConceptNode, column: number }[] = sources.map(node => ({ node, column: 0 }));
    let maxColumn = 0;
    
    while (queue.length > 0) {
      const { node, column } = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      
      if (!columns.has(column)) columns.set(column, []);
      columns.get(column)!.push(node);
      maxColumn = Math.max(maxColumn, column);
      
      // Add children to next column
      data.edges
        .filter(e => e.source === node.id)
        .forEach(edge => {
          const target = data.nodes.find(n => n.id === edge.target);
          if (target && !visited.has(target.id)) {
            queue.push({ node: target, column: column + 1 });
          }
        });
    }
    
    // Add unvisited nodes
    data.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const col = Math.floor(Math.random() * (maxColumn + 1));
        if (!columns.has(col)) columns.set(col, []);
        columns.get(col)!.push(node);
      }
    });
    
    // Convert to positioned nodes
    const timelineNodes: TimelineNode[] = [];
    columns.forEach((columnNodes, columnIndex) => {
      columnNodes.forEach((node, rowIndex) => {
        timelineNodes.push({
          ...node,
          column: columnIndex,
          row: rowIndex,
        });
      });
    });
    
    return timelineNodes;
  };

  const timelineNodes = buildTimelineLayout();
  const nodeMap = new Map(timelineNodes.map(n => [n.id, n]));
  
  const maxColumn = Math.max(...timelineNodes.map(n => n.column));
  const maxRow = Math.max(...timelineNodes.map(n => n.row));
  
  // RESPONSIVE SIZING: Calculate optimal dimensions based on content and screen
  const nodeCount = timelineNodes.length;
  const avgNodesPerColumn = nodeCount / (maxColumn + 1);
  
  // Dynamic card size: larger when fewer nodes, smaller when many
  const cardWidth = Math.max(300, Math.min(450, dimensions.width / (maxColumn + 2)));
  const cardHeight = 160;
  
  // Dynamic column spacing: use available width efficiently
  const columnWidth = Math.max(cardWidth + 100, dimensions.width / (maxColumn + 2));
  const rowHeight = cardHeight + 60;

  // Filter by search
  const filteredNodes = timelineNodes.filter(node =>
    !searchQuery || 
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

  // Get connected nodes for hover highlighting
  const getConnectedNodes = (nodeId: string): Set<string> => {
    const connected = new Set<string>([nodeId]);
    data.edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return connected;
  };

  const connectedToHovered = hoveredNode ? getConnectedNodes(hoveredNode.id) : new Set();
  const connectedToSelected = selectedNode ? getConnectedNodes(selectedNode) : new Set();

  const handleExport = () => {
    if (!containerRef.current) return;
    alert('Timeline export coming soon! Use browser screenshot for now.');
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    if (containerRef.current) {
      const scrollContainer = containerRef.current.querySelector('.overflow-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3 flex-wrap">
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

        <div className="flex items-center gap-2">
          <button 
            onClick={handleZoomOut}
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <span className="glass-panel rounded-lg px-3 py-2 text-xs text-white/80 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={handleZoomIn}
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <button 
            onClick={handleResetView}
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        </div>

        <button
          onClick={() => setShowAllConnections(!showAllConnections)}
          className={`p-2 rounded-lg glass-panel transition-colors ${
            showAllConnections ? 'bg-purple-500/30 border border-purple-400/50' : 'hover:bg-white/10'
          }`}
          title={showAllConnections ? "Hide connections" : "Show all connections"}
        >
          <Network className="w-4 h-4 text-white" />
        </button>

        <button 
          onClick={handleExport} 
          className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          title="Export"
        >
          <Download className="w-4 h-4 text-white" />
        </button>

        <div className="glass-panel rounded-lg px-3 py-2 text-xs text-white/80 flex items-center gap-2">
          <Info className="w-3 h-3" />
          <span>Scroll horizontally →</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="w-full h-full overflow-auto pt-20 pb-20">
        <div 
          className="relative p-8 transition-transform duration-300"
          style={{ 
            width: `${(maxColumn + 1) * columnWidth + 200}px`,
            minHeight: `${(maxRow + 1) * rowHeight + 200}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Timeline axis */}
          <div 
            className="absolute top-12 left-0 h-0.5 bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-purple-500/50"
            style={{ width: `${(maxColumn + 1) * columnWidth}px` }}
          />

          {/* Column headers */}
          {Array.from({ length: maxColumn + 1 }, (_, i) => (
            <div
              key={`header-${i}`}
              className="absolute top-0 glass-panel rounded-lg px-4 py-2"
              style={{ left: `${i * columnWidth + 40}px` }}
            >
              <div className="text-white/90 text-sm">
                Stage {i + 1}
              </div>
            </div>
          ))}

          {/* Connections (arrows) - SMART RENDERING */}
          <svg 
            className="absolute top-0 left-0 pointer-events-none"
            style={{ 
              width: `${(maxColumn + 1) * columnWidth + 200}px`,
              height: `${(maxRow + 1) * rowHeight + 200}px`
            }}
          >
            <defs>
              <marker
                id="arrowhead-timeline"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="rgba(168, 85, 247, 0.6)" />
              </marker>
              <marker
                id="arrowhead-highlight"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="rgba(168, 85, 247, 0.9)" />
              </marker>
            </defs>

            {data.edges.map((edge, i) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              const isConnectedToHovered = connectedToHovered.has(source.id) && connectedToHovered.has(target.id);
              const isConnectedToSelected = connectedToSelected.has(source.id) && connectedToSelected.has(target.id);
              const isHighlighted = isConnectedToHovered || isConnectedToSelected;
              
              const isFiltered = searchQuery && 
                (!filteredNodeIds.has(source.id) && !filteredNodeIds.has(target.id));

              // SMART VISIBILITY: Only show if highlighted or "show all" is enabled
              if (isFiltered || (!showAllConnections && !isHighlighted)) return null;

              const cardWidthHalf = cardWidth / 2;
              const x1 = source.column * columnWidth + 40 + cardWidth;
              const y1 = source.row * rowHeight + 80 + (cardHeight / 2);
              const x2 = target.column * columnWidth + 40;
              const y2 = target.row * rowHeight + 80 + (cardHeight / 2);

              return (
                <g key={`edge-${i}`}>
                  <path
                    d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isHighlighted ? getNodeColor(source.type) : 'rgba(168, 85, 247, 0.3)'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    markerEnd={isHighlighted ? "url(#arrowhead-highlight)" : "url(#arrowhead-timeline)"}
                    opacity={isHighlighted ? 1 : 0.4}
                    className="transition-all duration-300"
                  />
                  {/* Edge label on hover */}
                  {isHighlighted && edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 10}
                      fill="white"
                      fontSize="11"
                      textAnchor="middle"
                      className="pointer-events-none"
                      style={{ 
                        textShadow: '0 0 4px rgba(0,0,0,0.8)',
                        filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                      }}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes - RESPONSIVE CARDS */}
          {timelineNodes.map((node) => {
            const isSearchMatch = searchQuery && filteredNodeIds.has(node.id);
            const isSelected = selectedNode === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isConnected = connectedToHovered.has(node.id) || connectedToSelected.has(node.id);
            const isFiltered = searchQuery && !isSearchMatch;

            if (isFiltered) return null;

            const x = node.column * columnWidth + 40;
            const y = node.row * rowHeight + 80;

            return (
              <div
                key={node.id}
                className={`
                  absolute glass-panel-strong rounded-2xl p-5 cursor-pointer transition-all duration-300
                  ${isSelected ? 'ring-2 ring-white shadow-2xl scale-105 z-10' : ''}
                  ${isSearchMatch ? 'ring-2 ring-yellow-400 z-10' : ''}
                  ${isHovered ? 'scale-105 shadow-2xl z-10' : 'shadow-lg'}
                  ${isConnected && !isHovered && !isSelected ? 'ring-1 ring-purple-400/50' : ''}
                `}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${cardWidth}px`,
                  minHeight: `${cardHeight}px`,
                  border: `2px solid ${getNodeColor(node.type)}60`,
                }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{
                      backgroundColor: getNodeColor(node.type) + '30',
                      border: `2px solid ${getNodeColor(node.type)}`,
                    }}
                  >
                    {getNodeIcon(node.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white truncate">{node.label}</div>
                    <div className="text-xs text-white/60">{node.type}</div>
                  </div>
                </div>

                {/* Definition */}
                <div className="text-sm text-white/80 line-clamp-3 mb-3">
                  {node.definition}
                </div>

                {/* Metrics */}
                {node.metrics && Object.keys(node.metrics).length > 0 && (
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 mb-1">📊 Metrics</div>
                    <div className="space-y-1">
                      {Object.entries(node.metrics).slice(0, 2).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-white/60">{key}:</span>
                          <span className="text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Arrow indicator for connections */}
                {data.edges.filter(e => e.source === node.id).length > 0 && (
                  <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                    <ChevronRight className="w-5 h-5 text-purple-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && hoveredNode.role && (
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
              <h4 className="text-white text-lg mb-2">{hoveredNode.label}</h4>
              <p className="text-sm text-purple-300">
                <span className="text-white/60">Role:</span> {hoveredNode.role}
              </p>
              {hoveredNode.category && (
                <p className="text-sm text-cyan-300 mt-2">
                  <span className="text-white/60">Category:</span> {hoveredNode.category}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {data.nodes.length} concepts • {maxColumn + 1} stages • {data.edges.length} connections
      </div>
    </div>
  );
}
