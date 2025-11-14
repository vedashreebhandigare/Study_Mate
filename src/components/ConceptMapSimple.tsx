/**
 * ULTRA-SIMPLE Concept Map - Maximum Performance
 * Uses built-in ForceGraph features only, minimal custom rendering
 * OPTIMIZED: Auto-fit, responsive sizing, smart defaults
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { 
  Search, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  RefreshCw,
  Loader2,
  Info,
} from "lucide-react";
import { GlassButton } from "./GlassButton";
import { 
  ConceptMapData,
  ConceptEdge,
  getNodeColor,
  calculateNodeImportance,
} from "../lib/concept-map-generator";
import { getOptimalSettings, getLayoutRecommendations } from "../lib/layout-optimizer";

interface ConceptMapProps {
  data: ConceptMapData;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  documentTitle?: string;
}

export function ConceptMapSimple({ 
  data, 
  onRegenerate, 
  isGenerating = false,
  documentTitle 
}: ConceptMapProps) {
  const graphRef = useRef<ForceGraphMethods>();
  const [searchQuery, setSearchQuery] = useState("");
  const [dimensions, setDimensions] = useState({ width: 1400, height: 800 });
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Update dimensions on resize
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

  // Get optimal settings using layout optimizer
  const optimalSettings = useMemo(() => {
    return getOptimalSettings(
      data.nodes,
      data.edges,
      'force',
      dimensions.width,
      dimensions.height
    );
  }, [data.nodes, data.edges, dimensions]);

  // Get layout recommendations
  const recommendations = useMemo(() => {
    return getLayoutRecommendations(data.nodes, data.edges, 'force');
  }, [data.nodes, data.edges]);

  // Auto-fit on mount and data change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(400, 50);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  // Ultra-simple graph data - just what ForceGraph needs
  const graphData = useMemo(() => {
    const nodeIds = new Set(data.nodes.map(n => n.id));
    const validEdges = data.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      nodes: data.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        color: getNodeColor(node.type),
        val: 5 + calculateNodeImportance(node.id, validEdges) * 2,
      })),
      links: validEdges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        label: edge.label,
      })),
    };
  }, [data.nodes, data.edges]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;

    const matchingNode = graphData.nodes.find((node) =>
      node.label.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingNode && graphRef.current) {
      // Force layout to complete first
      for (let i = 0; i < 100; i++) {
        graphRef.current.d3Force('charge');
      }
      
      const node = graphRef.current.graph().nodes.find((n: any) => n.id === matchingNode.id);
      if (node) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2.5, 500);
      }
    }
  }, [graphData.nodes]);

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    canvas?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `concept-map.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="relative h-full w-full">
      {/* Optimized Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-panel border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400/50"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={() => graphRef.current?.zoom(1.5, 300)} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => graphRef.current?.zoom(0.75, 300)} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => graphRef.current?.zoomToFit(400, 50)} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Fit to Screen">
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <button onClick={handleExport} className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors" title="Export PNG">
            <Download className="w-4 h-4 text-white" />
          </button>
          {recommendations.length > 0 && (
            <button 
              onClick={() => setShowRecommendations(!showRecommendations)} 
              className={`p-2 rounded-lg glass-panel transition-colors ${showRecommendations ? 'bg-blue-500/30' : 'hover:bg-white/10'}`}
              title="Layout Recommendations"
            >
              <Info className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

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

      {/* Layout Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="absolute top-20 right-4 z-20 glass-panel-strong rounded-2xl p-4 max-w-sm shadow-2xl">
          <div className="text-white mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Layout Tips</span>
          </div>
          <ul className="space-y-1 text-sm text-white/80">
            {recommendations.map((rec, i) => (
              <li key={i} className="leading-relaxed">{rec}</li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
            Quality: <span className={`
              ${optimalSettings.quality === 'excellent' ? 'text-green-400' : ''}
              ${optimalSettings.quality === 'good' ? 'text-blue-400' : ''}
              ${optimalSettings.quality === 'acceptable' ? 'text-yellow-400' : ''}
              ${optimalSettings.quality === 'poor' ? 'text-red-400' : ''}
            `}>{optimalSettings.quality}</span>
          </div>
        </div>
      )}

      {/* Ultra-Simple Graph - Uses ALL built-in features */}
      <ForceGraph2D
        ref={graphRef as any}
        graphData={graphData}
        nodeId="id"
        nodeLabel="label"
        nodeColor="color"
        nodeVal="val"
        nodeRelSize={optimalSettings.dimensions.nodeSize / 5}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          // Only draw label - let ForceGraph handle the node circle
          const label = node.label;
          const fontSize = optimalSettings.dimensions.fontSize / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFF';
          ctx.fillText(label, node.x, node.y - node.val - 4);
        }}
        nodeCanvasObjectMode={() => 'after'}
        linkColor={(link: any) => {
          const edge = link as ConceptEdge;
          
          // ✨ NEW: Color based on user mastery (if available)
          if (edge.userMastery !== undefined && edge.userMastery !== null) {
            if (edge.userMastery < 0.5) return 'rgba(239, 68, 68, 0.6)'; // Red - weak understanding
            if (edge.userMastery < 0.7) return 'rgba(251, 191, 36, 0.6)'; // Yellow - moderate
            return 'rgba(34, 197, 94, 0.6)'; // Green - strong understanding
          }
          
          // Default: white/transparent
          return 'rgba(255, 255, 255, 0.2)';
        }}
        linkWidth={(link: any) => {
          const edge = link as ConceptEdge;
          
          // ✨ NEW: Width based on relationship strength (BERT similarity)
          if (edge.relationshipStrength) {
            // Map 0.0-1.0 to 1-5px (stronger relationships = thicker lines)
            return 1 + (edge.relationshipStrength * 4);
          }
          
          // Default width
          return optimalSettings.dimensions.strokeWidth;
        }}
        linkLabel={(link: any) => {
          const edge = link as ConceptEdge;
          let label = edge.label || '';
          
          // ✨ NEW: Add similarity percentage to tooltip
          if (edge.semanticSimilarity) {
            label += `\n📊 Similarity: ${Math.round(edge.semanticSimilarity * 100)}%`;
          }
          
          // ✨ NEW: Add user mastery to tooltip
          if (edge.userMastery !== undefined && edge.userMastery !== null) {
            label += `\n🎯 Your Mastery: ${Math.round(edge.userMastery * 100)}%`;
          }
          
          // ✨ NEW: Add review recommendation
          if (edge.recommendedReview) {
            label += `\n⚠️ Recommended for review`;
          }
          
          return label;
        }}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        cooldownTicks={300}
        d3AlphaDecay={0.005}
        d3VelocityDecay={0.15}
        d3ReheatSimulation={false}
        enableNodeDrag={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor="rgba(0,0,0,0)"
        width={dimensions.width}
        height={dimensions.height}
        d3Force={{
          charge: { strength: -800, distanceMax: 500 },
          link: { distance: optimalSettings.dimensions.spacing, strength: 0.5 },
          center: { strength: 0.05 }
        }}
      />

      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {data.nodes.length} nodes • {data.edges.length} edges
        {optimalSettings.quality !== 'excellent' && (
          <span className="ml-2 text-yellow-400">• {optimalSettings.quality} layout</span>
        )}
      </div>
    </div>
  );
}
