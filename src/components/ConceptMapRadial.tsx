/**
 * Radial/Circular Visualization for Concept Maps
 * Core concept in center, related concepts radiating outward in rings
 */

import { useState, useEffect, useRef } from "react";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
} from "../lib/concept-map-generator";
import { Search, Download } from "lucide-react";

interface ConceptMapRadialProps {
  data: ConceptMapData;
  documentTitle?: string;
}

export function ConceptMapRadial({ data, documentTitle }: ConceptMapRadialProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [positions, setPositions] = useState<Map<string, {x: number, y: number, ring: number}>>(new Map());

  // Calculate positions
  useEffect(() => {
    const newPositions = new Map<string, {x: number, y: number, ring: number}>();
    
    // Find central node (most connected)
    const connectionCounts = new Map<string, number>();
    data.edges.forEach(edge => {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
    });

    let centralNode = data.nodes[0];
    let maxConnections = 0;
    data.nodes.forEach(node => {
      const count = connectionCounts.get(node.id) || 0;
      if (count > maxConnections) {
        maxConnections = count;
        centralNode = node;
      }
    });

    const centerX = 400;
    const centerY = 400;
    
    // Place central node
    newPositions.set(centralNode.id, { x: centerX, y: centerY, ring: 0 });

    // Get directly connected nodes
    const directlyConnected = new Set<string>();
    data.edges.forEach(edge => {
      if (edge.source === centralNode.id) directlyConnected.add(edge.target);
      if (edge.target === centralNode.id) directlyConnected.add(edge.source);
    });

    // Place ring 1 (directly connected)
    const ring1Nodes = data.nodes.filter(n => directlyConnected.has(n.id));
    const ring1Radius = 200;
    ring1Nodes.forEach((node, i) => {
      const angle = (i / ring1Nodes.length) * 2 * Math.PI;
      newPositions.set(node.id, {
        x: centerX + ring1Radius * Math.cos(angle),
        y: centerY + ring1Radius * Math.sin(angle),
        ring: 1
      });
    });

    // Place ring 2 (remaining nodes)
    const ring2Nodes = data.nodes.filter(n => 
      n.id !== centralNode.id && !directlyConnected.has(n.id)
    );
    const ring2Radius = 320;
    ring2Nodes.forEach((node, i) => {
      const angle = (i / ring2Nodes.length) * 2 * Math.PI;
      newPositions.set(node.id, {
        x: centerX + ring2Radius * Math.cos(angle),
        y: centerY + ring2Radius * Math.sin(angle),
        ring: 2
      });
    });

    setPositions(newPositions);
  }, [data]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || positions.size === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.lineWidth = 2;
    data.edges.forEach(edge => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      if (sourcePos && targetPos) {
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();

        // Arrow
        const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
        const arrowLength = 10;
        ctx.beginPath();
        ctx.moveTo(targetPos.x, targetPos.y);
        ctx.lineTo(
          targetPos.x - arrowLength * Math.cos(angle - Math.PI / 6),
          targetPos.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(targetPos.x, targetPos.y);
        ctx.lineTo(
          targetPos.x - arrowLength * Math.cos(angle + Math.PI / 6),
          targetPos.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    });
  }, [positions, data.edges]);

  const handleNodeClick = (node: ConceptNode) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
      </div>

      {/* Canvas for edges */}
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />

      {/* Nodes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {data.nodes.map(node => {
          const pos = positions.get(node.id);
          if (!pos) return null;

          const isSearchMatch = searchQuery && 
            (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
             node.definition.toLowerCase().includes(searchQuery.toLowerCase()));
          const isSelected = selectedNode === node.id;
          const isHovered = hoveredNode?.id === node.id;
          const size = pos.ring === 0 ? 80 : pos.ring === 1 ? 60 : 50;

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              className={`
                absolute cursor-pointer transition-all duration-200
                ${isSelected ? 'scale-110 z-30' : 'z-10'}
                ${isHovered ? 'scale-105 z-20' : ''}
                ${isSearchMatch ? 'ring-2 ring-yellow-400' : ''}
              `}
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
                width: size,
                height: size,
              }}
            >
              <div
                className="w-full h-full rounded-full flex flex-col items-center justify-center shadow-xl"
                style={{
                  backgroundColor: getNodeColor(node.type),
                  border: isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                }}
              >
                <span className={`${pos.ring === 0 ? 'text-2xl' : 'text-lg'}`}>
                  {getNodeIcon(node.type)}
                </span>
                {pos.ring === 0 && (
                  <span className="text-white text-xs mt-1 font-medium px-1 text-center line-clamp-2">
                    {node.label}
                  </span>
                )}
              </div>
              {pos.ring > 0 && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                    {node.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 right-4 glass-panel-strong rounded-2xl p-5 z-50 max-w-2xl pointer-events-none">
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
              <p className="text-sm text-white/90 mb-2">{hoveredNode.definition}</p>
              {hoveredNode.role && (
                <p className="text-sm text-purple-300">
                  <span className="text-white/60">Role:</span> {hoveredNode.role}
                </p>
              )}
              {hoveredNode.metrics && Object.keys(hoveredNode.metrics).length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(hoveredNode.metrics).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-white/60">{key}:</span>{' '}
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-20 right-4 glass-panel-strong rounded-xl p-4 text-xs text-white/80">
        <div className="mb-2 text-white">Rings:</div>
        <div>● Center: Core concept</div>
        <div>● Ring 1: Direct connections</div>
        <div>● Ring 2: Secondary concepts</div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {data.nodes.length} concepts • {data.edges.length} relationships
      </div>
    </div>
  );
}
