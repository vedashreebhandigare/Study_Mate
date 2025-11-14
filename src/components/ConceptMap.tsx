/**
 * Interactive Concept Map Visualization
 * FREEZE FIX - NO ANIMATIONS, SIMPLE TOOLTIPS ONLY
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { 
  Search, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Info,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { GlassButton } from "./GlassButton";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
  calculateNodeImportance,
  NodeType,
} from "../lib/concept-map-generator";

interface ConceptMapProps {
  data: ConceptMapData;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  documentTitle?: string;
}

interface GraphNode extends NodeObject {
  id: string;
  label: string;
  type: NodeType;
  definition: string;
  role?: string;
  category?: string;
  metrics?: { [key: string]: string | number };
  importance?: number;
}

interface GraphLink extends LinkObject {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  description?: string;
}

export function ConceptMap({ 
  data, 
  onRegenerate, 
  isGenerating = false,
  documentTitle 
}: ConceptMapProps) {
  const graphRef = useRef<ForceGraphMethods>();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(true);

  // Memoize graph data
  const graphData = useMemo(() => {
    const nodeIds = new Set(data.nodes.map(n => n.id));
    const validEdges = data.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      nodes: data.nodes.map((node) => ({
        ...node,
        importance: calculateNodeImportance(node.id, validEdges),
      })) as GraphNode[],
      links: validEdges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        label: edge.label,
        description: edge.description,
      })) as GraphLink[],
    };
  }, [data.nodes, data.edges]);

  const getNodeId = (node: string | GraphNode): string => {
    return typeof node === 'string' ? node : node.id;
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
      setHighlightedNodes(new Set());
      setHighlightedLinks(new Set());
    } else {
      setSelectedNode(node);
      const connectedNodes = new Set<string>([node.id]);
      const connectedLinks = new Set<string>();

      graphData.links.forEach((link) => {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        
        if (sourceId === node.id || targetId === node.id) {
          connectedNodes.add(sourceId);
          connectedNodes.add(targetId);
          connectedLinks.add(`${sourceId}-${targetId}`);
        }
      });

      setHighlightedNodes(connectedNodes);
      setHighlightedLinks(connectedLinks);
    }
  }, [selectedNode, graphData.links]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setHighlightedNodes(new Set());
      setHighlightedLinks(new Set());
      setSelectedNode(null);
      return;
    }

    const matchingNodes = graphData.nodes.filter((node) =>
      node.label.toLowerCase().includes(query.toLowerCase()) ||
      node.definition.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingNodes.length > 0) {
      const matchingIds = new Set(matchingNodes.map((n) => n.id));
      setHighlightedNodes(matchingIds);
      
      const firstMatch = matchingNodes[0];
      if (graphRef.current && firstMatch.x && firstMatch.y) {
        graphRef.current.centerAt(firstMatch.x, firstMatch.y, 500);
        graphRef.current.zoom(2, 500);
      }
    }
  }, [graphData.nodes]);

  const handleExport = useCallback((format: 'png' | 'svg' = 'png') => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    if (format === 'png') {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `concept-map-${documentTitle || 'graph'}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    } else {
      // SVG export - convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
             width="${canvas.width}" height="${canvas.height}">
          <image width="${canvas.width}" height="${canvas.height}" xlink:href="${dataUrl}"/>
        </svg>
      `;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `concept-map-${documentTitle || 'graph'}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [documentTitle]);

  const handleZoomIn = () => graphRef.current?.zoom(1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(0.75, 300);
  const handleZoomFit = () => graphRef.current?.zoomToFit(400);

  const clearHighlight = () => {
    setSelectedNode(null);
    setHighlightedNodes(new Set());
    setHighlightedLinks(new Set());
  };

  // CRITICAL FIX: Super simple hover - NO ANIMATION
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
    setHoveredLink(null); // Clear link tooltip when hovering node
  }, []);

  const handleLinkHover = useCallback((link: GraphLink | null) => {
    setHoveredLink(link);
    setHoveredNode(null); // Clear node tooltip when hovering link
  }, []);

  const nodeTypes: { type: NodeType; color: string; label: string }[] = [
    { type: "model", color: getNodeColor("model"), label: "Models" },
    { type: "dataset", color: getNodeColor("dataset"), label: "Datasets" },
    { type: "metric", color: getNodeColor("metric"), label: "Metrics" },
    { type: "technique", color: getNodeColor("technique"), label: "Techniques" },
    { type: "component", color: getNodeColor("component"), label: "Components" },
    { type: "tradeoff", color: getNodeColor("tradeoff"), label: "Trade-offs" },
  ];

  // Calculate graph quality metrics
  const avgConnectionsPerNode = graphData.links.length / Math.max(graphData.nodes.length, 1);
  const isHighQuality = avgConnectionsPerNode >= 1.5 && graphData.links.length >= 20;
  const isMediumQuality = avgConnectionsPerNode >= 1.0 && graphData.links.length >= 10;

  return (
    <div className="relative h-full w-full">
      {/* Quality Indicator */}
      {!isHighQuality && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel-strong rounded-full px-4 py-2 text-xs flex items-center gap-2 border border-yellow-400/30">
          <span className={`w-2 h-2 rounded-full ${isMediumQuality ? 'bg-yellow-400' : 'bg-orange-400'} animate-pulse`} />
          <span className="text-white/90">
            {isMediumQuality 
              ? `Graph connectivity: Medium (${avgConnectionsPerNode.toFixed(1)} edges/node)` 
              : `Graph connectivity: Low (${avgConnectionsPerNode.toFixed(1)} edges/node)`}
          </span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-panel border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400/50"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={handleZoomIn} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <button onClick={handleZoomOut} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <button onClick={handleZoomFit} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Fit">
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="relative group">
          <button 
            onClick={() => handleExport('png')} 
            className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" 
            title="Export as PNG"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
          <div className="absolute top-full mt-1 right-0 hidden group-hover:block">
            <div className="glass-panel rounded-lg p-1 min-w-[100px] shadow-xl">
              <button 
                onClick={() => handleExport('png')}
                className="w-full px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors text-left"
              >
                PNG
              </button>
              <button 
                onClick={() => handleExport('svg')}
                className="w-full px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors text-left"
              >
                SVG
              </button>
            </div>
          </div>
        </div>

        <button onClick={() => setShowLegend(!showLegend)} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Legend">
          <Info className="w-4 h-4 text-white" />
        </button>

        {onRegenerate && (
          <GlassButton onClick={onRegenerate} disabled={isGenerating} size="sm" variant="secondary">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            )}
          </GlassButton>
        )}
      </div>

      {/* Legend - NO ANIMATION */}
      {showLegend && (
        <div className="absolute top-4 right-4 glass-panel-strong rounded-2xl p-5 max-w-xs z-10">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-purple-300" />
            <h4 className="text-sm text-white">Concept Types</h4>
          </div>
          <div className="space-y-2.5">
            {nodeTypes.map(({ type, color, label }) => (
              <div key={type} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-white/90">{label}</span>
                <span className="text-sm text-white/50 ml-auto">{getNodeIcon(type)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <p className="text-xs text-purple-300/90">💡 Interactions:</p>
            <ul className="text-xs text-white/70 space-y-1 leading-relaxed">
              <li>• <span className="text-white/90">Click</span> node → highlight connections</li>
              <li>• <span className="text-white/90">Hover</span> node → view definition & metrics</li>
              <li>• <span className="text-white/90">Hover</span> edge → see relationship type</li>
              <li>• <span className="text-white/90">Search</span> to filter & focus</li>
            </ul>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-white/50 italic">
              Node size = importance (connections)
            </p>
          </div>
        </div>
      )}

      {/* SIMPLE TOOLTIP - NO ANIMATION, JUST CSS */}
      {hoveredNode && (
        <div 
          className="absolute bottom-4 left-4 right-4 glass-panel-strong rounded-2xl p-5 z-50 max-w-2xl pointer-events-none shadow-2xl"
          style={{ 
            transition: 'opacity 0.15s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-white text-lg">{hoveredNode.label}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {hoveredNode.type}
                </span>
              </div>
              
              {hoveredNode.definition ? (
                <div className="mb-3">
                  <p className="text-xs text-purple-300/90 mb-1">💡 Definition:</p>
                  <p className="text-sm text-white/90 leading-relaxed">{hoveredNode.definition}</p>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-xs text-white/50 italic">No definition available</p>
                </div>
              )}

              {hoveredNode.role && (
                <div className="mb-3">
                  <p className="text-xs text-cyan-300/90 mb-1">🎯 Role:</p>
                  <p className="text-sm text-white/90 leading-relaxed">{hoveredNode.role}</p>
                </div>
              )}
              
              {hoveredNode.category && (
                <div className="mb-2">
                  <p className="text-xs text-emerald-300/90 mb-1">📂 Category:</p>
                  <p className="text-sm text-white/80">{hoveredNode.category}</p>
                </div>
              )}

              {hoveredNode.metrics && Object.keys(hoveredNode.metrics).length > 0 && (
                <div className="mb-2 p-3 bg-gradient-to-br from-orange-500/10 to-purple-500/10 rounded-lg border border-orange-400/30">
                  <div className="text-xs text-orange-300 mb-2 flex items-center gap-1.5">
                    <span>📊</span>
                    <span className="uppercase tracking-wide">Performance Data</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {Object.entries(hoveredNode.metrics).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="text-white/60 text-xs block mb-0.5">{key.replace(/_/g, ' ')}</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDGE TOOLTIP - Shows relationship details on hover */}
      {hoveredLink && (
        <div 
          className="absolute top-20 left-4 right-4 glass-panel-strong rounded-xl p-4 z-50 max-w-lg pointer-events-none shadow-2xl"
          style={{ 
            transition: 'opacity 0.15s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/80">{typeof hoveredLink.source === 'string' ? hoveredLink.source : hoveredLink.source.label}</span>
              <span className="text-purple-300">→</span>
              <span className="text-white/80">{typeof hoveredLink.target === 'string' ? hoveredLink.target : hoveredLink.target.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                {hoveredLink.label.replace(/_/g, ' ')}
              </span>
            </div>
            {hoveredLink.description && (
              <p className="text-sm text-white/90 leading-relaxed mt-2 pt-2 border-t border-white/10">
                {hoveredLink.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Graph - CRITICAL SETTINGS */}
      <ForceGraph2D
        ref={graphRef as any}
        graphData={graphData}
        nodeLabel={(node: any) => node.label}
        nodeAutoColorBy="type"
        nodeColor={(node: any) => {
          const n = node as GraphNode;
          const isHighlighted = highlightedNodes.size === 0 || highlightedNodes.has(n.id);
          return isHighlighted ? getNodeColor(n.type) : '#444';
        }}
        nodeVal={(node: any) => {
          const n = node as GraphNode;
          return 5 + (n.importance || 0) * 2;
        }}
        nodeCanvasObjectMode={() => 'after'}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const n = node as GraphNode;
          const isHighlighted = highlightedNodes.size === 0 || highlightedNodes.has(n.id);
          const isSelected = selectedNode?.id === n.id;
          const size = 5 + (n.importance || 0) * 2;

          // Draw label
          const label = n.label;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isHighlighted ? '#FFF' : '#999';
          ctx.fillText(label, node.x, node.y - size - 8 / globalScale);

          // Draw selection ring
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();
          }
        }}
        linkColor={(link: any) => {
          const l = link as GraphLink;
          const sourceId = getNodeId(l.source);
          const targetId = getNodeId(l.target);
          const isHighlighted = highlightedLinks.size === 0 || 
            highlightedLinks.has(`${sourceId}-${targetId}`);
          // 🔥 MADE EDGES MORE VISIBLE
          return isHighlighted ? 'rgba(168, 85, 247, 0.6)' : 'rgba(255, 255, 255, 0.25)';
        }}
        linkWidth={(link: any) => {
          const l = link as GraphLink;
          const sourceId = getNodeId(l.source);
          const targetId = getNodeId(l.target);
          const isHighlighted = highlightedLinks.size === 0 || 
            highlightedLinks.has(`${sourceId}-${targetId}`);
          // 🔥 MADE EDGES THICKER - was 2:1, now 3:1.5
          return isHighlighted ? 3 : 1.5;
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkLabel={(link: any) => {
          const l = link as GraphLink;
          return l.description || l.label.replace(/_/g, ' ');
        }}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const l = link as GraphLink;
          const start = l.source as GraphNode;
          const end = l.target as GraphNode;
          
          // Skip if positions not available yet
          if (!start.x || !start.y || !end.x || !end.y) return;
          
          // Calculate middle point for label
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          
          // Only show labels for highlighted links or when zoomed in
          const shouldShowLabel = highlightedLinks.size > 0 && 
            highlightedLinks.has(`${getNodeId(start)}-${getNodeId(end)}`);
          
          if (shouldShowLabel && globalScale > 1.5) {
            const label = l.label.replace(/_/g, ' ');
            const fontSize = 10 / globalScale;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Background for readability
            const metrics = ctx.measureText(label);
            const padding = 4 / globalScale;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(
              midX - metrics.width / 2 - padding,
              midY - fontSize / 2 - padding,
              metrics.width + padding * 2,
              fontSize + padding * 2
            );
            
            // Label text
            ctx.fillStyle = '#A78BFA';
            ctx.fillText(label, midX, midY);
          }
        }}
        linkCanvasObjectMode={() => 'after'}
        onNodeClick={handleNodeClick as any}
        onNodeHover={handleNodeHover as any}
        onLinkHover={handleLinkHover as any}
        onBackgroundClick={clearHighlight}
        cooldownTicks={300}
        d3AlphaDecay={0.005}
        d3VelocityDecay={0.15}
        warmupTicks={100}
        d3ReheatSimulation={false}
        enableNodeDrag={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor="rgba(0,0,0,0)"
        width={window.innerWidth - 100}
        height={window.innerHeight - 200}
        d3Force={{
          charge: { strength: -800, distanceMax: 500 },
          link: { distance: 100, strength: 0.5 },
          center: { strength: 0.05 }
        }}
      />

      {/* Stats Footer */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60 flex items-center gap-3">
        <span>{data.nodes.length} concepts • {data.edges.length} relationships</span>
        {data.edges.length < data.nodes.length * 1.5 && (
          <span className="text-yellow-400/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Low connectivity
          </span>
        )}
      </div>
    </div>
  );
}
