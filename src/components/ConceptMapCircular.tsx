/**
 * Circular Chord Visualization for Concept Maps
 * Elegant circular arrangement with curved relationship ribbons
 * OPTIMIZED: Responsive sizing, smart edge rendering, auto-scaling
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
} from "../lib/concept-map-generator";
import { Search, Download, RotateCw, Info, Maximize2 } from "lucide-react";
import { getOptimalSettings } from "../lib/layout-optimizer";

interface ConceptMapCircularProps {
  data: ConceptMapData;
  documentTitle?: string;
}

export function ConceptMapCircular({ data, documentTitle }: ConceptMapCircularProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showAllEdges, setShowAllEdges] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 1000 });

  useEffect(() => {
    const updateDimensions = () => {
      const size = Math.min(window.innerWidth - 100, window.innerHeight - 100, 1200);
      setDimensions({ width: size, height: size });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Get optimal settings
  const optimalSettings = useMemo(() => {
    return getOptimalSettings(
      data.nodes,
      data.edges,
      'circular',
      dimensions.width,
      dimensions.height
    );
  }, [data.nodes, data.edges, dimensions]);

  // Auto-show edges if not too many
  useEffect(() => {
    setShowAllEdges(optimalSettings.shouldShowAllEdges);
  }, [optimalSettings.shouldShowAllEdges]);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  // Responsive radius based on node count
  const baseRadius = Math.min(dimensions.width, dimensions.height) / 2 - 150;
  const radius = Math.max(baseRadius, data.nodes.length * 8); // Scale with nodes

  // Position nodes in a circle
  const positionedNodes = data.nodes.map((node, index) => {
    const angle = (index / data.nodes.length) * 2 * Math.PI + (rotation * Math.PI / 180);
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      angle: angle * (180 / Math.PI),
    };
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
    link.download = `concept-map-circular-${documentTitle || 'graph'}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3 flex-wrap">
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
            onClick={() => setRotation(r => (r + 45) % 360)} 
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
            title="Rotate 45°"
          >
            <RotateCw className="w-4 h-4 text-white" />
          </button>

          <button 
            onClick={() => setRotation(0)} 
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>

          <button 
            onClick={() => setShowAllEdges(!showAllEdges)} 
            className={`p-2 rounded-lg glass-panel transition-colors ${showAllEdges ? 'bg-purple-500/30' : 'hover:bg-white/10'}`}
            title={showAllEdges ? "Hide edges" : "Show all edges"}
          >
            <Info className="w-4 h-4 text-white" />
          </button>

          <button 
            onClick={handleExport} 
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
            title="Export SVG"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full h-full flex items-center justify-center overflow-auto pt-16 pb-20">
        <svg 
          ref={svgRef}
          width={dimensions.width} 
          height={dimensions.height}
          className="transition-all duration-500"
        >
          <defs>
            {/* Radial gradient for center */}
            <radialGradient id="centerGradient">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </radialGradient>

            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Central circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius + 30}
            fill="url(#centerGradient)"
            opacity={0.2}
          />

          {/* Circular guide */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="rgba(139, 92, 246, 0.2)"
            strokeWidth={1}
            strokeDasharray="5,5"
          />

          {/* Relationship ribbons - SMART RENDERING */}
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

            // SMART VISIBILITY: Only show if highlighted or showAll is enabled
            if (isFiltered || (!showAllEdges && !isHighlighted)) return null;

            // Create curved path through center for visual appeal
            const path = `M ${source.x} ${source.y} Q ${centerX} ${centerY} ${target.x} ${target.y}`;

            return (
              <path
                key={`edge-${i}`}
                d={path}
                fill="none"
                stroke={isHighlighted ? getNodeColor(source.type) : 'rgba(168, 85, 247, 0.25)'}
                strokeWidth={isHighlighted ? 2.5 : 1}
                opacity={isHighlighted ? 0.9 : 0.25}
                filter={isHighlighted ? "url(#glow)" : undefined}
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

            // Responsive node size
            const nodeSize = optimalSettings.dimensions.nodeSize;
            const labelDistance = nodeSize + 15;
            
            // Calculate label position (outside the circle)
            const labelAngle = node.angle * (Math.PI / 180);
            const labelX = centerX + (radius + labelDistance) * Math.cos(labelAngle);
            const labelY = centerY + (radius + labelDistance) * Math.sin(labelAngle);
            
            // Text anchor based on position
            const textAnchor = labelX > centerX ? 'start' : labelX < centerX ? 'end' : 'middle';

            return (
              <g 
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Connection line to label */}
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={labelX - (textAnchor === 'start' ? 5 : textAnchor === 'end' ? -5 : 0)}
                  y2={labelY}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={1}
                />

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeSize / 2}
                  fill={getNodeColor(node.type) + '30'}
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
                  fontSize={nodeSize * 0.5}
                  className="pointer-events-none"
                >
                  {getNodeIcon(node.type)}
                </text>

                {/* Label */}
                <text
                  x={labelX}
                  y={labelY}
                  dominantBaseline="middle"
                  textAnchor={textAnchor}
                  fill="white"
                  fontSize={optimalSettings.dimensions.fontSize}
                  fontWeight={isHovered || isSelected ? '600' : '400'}
                  className="pointer-events-none transition-all"
                >
                  {node.label}
                </text>

                {/* Type badge */}
                <text
                  x={labelX}
                  y={labelY + 14}
                  dominantBaseline="middle"
                  textAnchor={textAnchor}
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize={optimalSettings.dimensions.fontSize * 0.8}
                  className="pointer-events-none"
                >
                  {node.type}
                </text>

                {/* Search highlight */}
                {isSearchMatch && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize / 2 + 3}
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
                  {hoveredNode.type}
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

      {/* Legend */}
      <div className="absolute top-4 right-4 glass-panel-strong rounded-xl p-4 max-w-xs z-10">
        <div className="text-sm text-white/90 mb-2">💡 Circular Layout</div>
        <div className="text-xs text-white/70 space-y-1">
          <div>• Concepts arranged in circle</div>
          <div>• Curved ribbons show relationships</div>
          <div>• Click nodes to highlight connections</div>
          <div>• Use rotate button to adjust view</div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {data.nodes.length} concepts • {data.edges.length} connections
        {!showAllEdges && (
          <span className="ml-2 text-purple-400">• edges on hover</span>
        )}
      </div>
    </div>
  );
}
