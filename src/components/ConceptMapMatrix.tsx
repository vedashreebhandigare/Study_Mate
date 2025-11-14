/**
 * Matrix/Heatmap Visualization for Concept Maps
 * Clean adjacency matrix showing relationship patterns and clusters
 */

import { useState, useRef } from "react";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
} from "../lib/concept-map-generator";
import { Search, Download, Info } from "lucide-react";

interface ConceptMapMatrixProps {
  data: ConceptMapData;
  documentTitle?: string;
}

export function ConceptMapMatrix({ data, documentTitle }: ConceptMapMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build adjacency matrix
  const adjacencyMap = new Map<string, Set<string>>();
  const edgeLabelMap = new Map<string, { label: string; description?: string }>();
  
  data.edges.forEach(edge => {
    const key = `${edge.source}-${edge.target}`;
    if (!adjacencyMap.has(edge.source)) {
      adjacencyMap.set(edge.source, new Set());
    }
    adjacencyMap.get(edge.source)!.add(edge.target);
    edgeLabelMap.set(key, { label: edge.label, description: edge.description });
  });

  // Sort nodes by type and connections
  const sortedNodes = [...data.nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    const aConnections = (adjacencyMap.get(a.id)?.size || 0);
    const bConnections = (adjacencyMap.get(b.id)?.size || 0);
    return bConnections - aConnections;
  });

  // Filter by search
  const filteredNodes = sortedNodes.filter(node =>
    !searchQuery || 
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cellSize = 50;
  const labelWidth = 180;
  const headerHeight = 180;

  const handleExport = () => {
    alert('Matrix export coming soon! Use browser screenshot for now.');
  };

  return (
    <div ref={containerRef} className="relative h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
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

        <button 
          onClick={handleExport} 
          className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          title="Export"
        >
          <Download className="w-4 h-4 text-white" />
        </button>

        <div className="glass-panel rounded-lg px-3 py-2 text-xs text-white/80 flex items-center gap-2">
          <Info className="w-3 h-3" />
          <span>Hover cells to see relationships</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="w-full h-full overflow-auto pt-20 pb-10">
        <div 
          className="relative"
          style={{ 
            width: `${labelWidth + filteredNodes.length * cellSize + 40}px`,
            height: `${headerHeight + filteredNodes.length * cellSize + 40}px`,
            margin: '20px',
          }}
        >
          {/* Column headers (vertical) */}
          <div className="absolute top-0 left-0" style={{ marginLeft: `${labelWidth}px`, marginTop: '20px' }}>
            {filteredNodes.map((node, colIndex) => (
              <div
                key={`col-${node.id}`}
                className="absolute origin-top-left cursor-pointer group"
                style={{
                  left: `${colIndex * cellSize + cellSize / 2}px`,
                  top: `${headerHeight - 10}px`,
                  transform: 'rotate(-65deg)',
                  width: `${headerHeight - 20}px`,
                }}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                <div className="flex items-center gap-2 p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors">
                  <span className="text-lg">{getNodeIcon(node.type)}</span>
                  <span 
                    className="text-white text-xs truncate"
                    style={{ 
                      maxWidth: `${headerHeight - 50}px`,
                      fontWeight: selectedNode === node.id ? '600' : '400',
                    }}
                  >
                    {node.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Row labels (horizontal) */}
          <div className="absolute top-0 left-0" style={{ marginTop: `${headerHeight}px` }}>
            {filteredNodes.map((node, rowIndex) => (
              <div
                key={`row-${node.id}`}
                className="absolute flex items-center gap-2 p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors cursor-pointer group"
                style={{
                  top: `${rowIndex * cellSize}px`,
                  left: 0,
                  width: `${labelWidth - 10}px`,
                  height: `${cellSize}px`,
                }}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                <span className="text-lg flex-shrink-0">{getNodeIcon(node.type)}</span>
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-white text-xs truncate"
                    style={{ fontWeight: selectedNode === node.id ? '600' : '400' }}
                  >
                    {node.label}
                  </div>
                  <div className="text-white/50 text-xs">{node.type}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix cells */}
          <div 
            className="absolute"
            style={{ 
              left: `${labelWidth}px`, 
              top: `${headerHeight}px`,
            }}
          >
            <svg 
              width={filteredNodes.length * cellSize} 
              height={filteredNodes.length * cellSize}
            >
              <defs>
                <filter id="cellGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Grid lines */}
              {filteredNodes.map((_, i) => (
                <g key={`grid-${i}`}>
                  <line
                    x1={0}
                    y1={i * cellSize}
                    x2={filteredNodes.length * cellSize}
                    y2={i * cellSize}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={1}
                  />
                  <line
                    x1={i * cellSize}
                    y1={0}
                    x2={i * cellSize}
                    y2={filteredNodes.length * cellSize}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={1}
                  />
                </g>
              ))}

              {/* Cells */}
              {filteredNodes.map((rowNode, rowIndex) => (
                filteredNodes.map((colNode, colIndex) => {
                  const hasEdge = adjacencyMap.get(rowNode.id)?.has(colNode.id);
                  const edgeKey = `${rowNode.id}-${colNode.id}`;
                  const edgeInfo = edgeLabelMap.get(edgeKey);
                  const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;
                  const isHighlighted = 
                    selectedNode === rowNode.id || 
                    selectedNode === colNode.id;

                  const opacity = hasEdge ? 0.8 : 0;
                  const color = hasEdge ? getNodeColor(rowNode.type) : 'transparent';

                  return (
                    <g key={`cell-${rowIndex}-${colIndex}`}>
                      {/* Cell background */}
                      <rect
                        x={colIndex * cellSize}
                        y={rowIndex * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill={color}
                        opacity={isHovered ? 1 : isHighlighted && hasEdge ? 0.9 : opacity}
                        className="transition-all duration-200 cursor-pointer"
                        filter={isHovered || isHighlighted ? "url(#cellGlow)" : undefined}
                        onMouseEnter={() => hasEdge && setHoveredCell({ row: rowIndex, col: colIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                      
                      {/* Diagonal indicator (self-reference or high importance) */}
                      {rowIndex === colIndex && (
                        <rect
                          x={colIndex * cellSize}
                          y={rowIndex * cellSize}
                          width={cellSize}
                          height={cellSize}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.3)"
                          strokeWidth={2}
                          className="pointer-events-none"
                        />
                      )}

                      {/* Connection indicator */}
                      {hasEdge && !isHovered && (
                        <circle
                          cx={colIndex * cellSize + cellSize / 2}
                          cy={rowIndex * cellSize + cellSize / 2}
                          r={6}
                          fill="white"
                          opacity={0.6}
                          className="pointer-events-none"
                        />
                      )}
                    </g>
                  );
                })
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredCell && (
        (() => {
          const rowNode = filteredNodes[hoveredCell.row];
          const colNode = filteredNodes[hoveredCell.col];
          const edgeKey = `${rowNode.id}-${colNode.id}`;
          const edgeInfo = edgeLabelMap.get(edgeKey);

          return (
            <div className="absolute bottom-4 left-4 right-4 glass-panel-strong rounded-2xl p-5 z-50 max-w-2xl pointer-events-none shadow-2xl">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getNodeIcon(rowNode.type)}</span>
                    <span className="text-white">{rowNode.label}</span>
                  </div>
                  <span className="text-purple-300 text-lg">→</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getNodeIcon(colNode.type)}</span>
                    <span className="text-white">{colNode.label}</span>
                  </div>
                </div>
                
                {edgeInfo && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                        {edgeInfo.label.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    {edgeInfo.description && (
                      <p className="text-sm text-white/90 leading-relaxed">
                        {edgeInfo.description}
                      </p>
                    )}
                  </>
                )}

                <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-white/60">Source:</span>
                    <p className="text-white/90 mt-1 line-clamp-2">{rowNode.definition}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Target:</span>
                    <p className="text-white/90 mt-1 line-clamp-2">{colNode.definition}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 glass-panel-strong rounded-xl p-4 max-w-xs z-10">
        <div className="text-sm text-white/90 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>Matrix View</span>
        </div>
        <div className="text-xs text-white/70 space-y-1">
          <div>• Rows = Source concepts</div>
          <div>• Columns = Target concepts</div>
          <div>• Colored cells = Relationships exist</div>
          <div>• Click labels to highlight</div>
          <div>• Hover cells for details</div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-white/60 mb-2">Grouped by type:</div>
          <div className="flex flex-wrap gap-1">
            {Array.from(new Set(data.nodes.map(n => n.type))).map(type => (
              <div 
                key={type}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: getNodeColor(type as any) + '30' }}
              >
                {type}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {filteredNodes.length} × {filteredNodes.length} matrix • {data.edges.length} connections
      </div>
    </div>
  );
}
