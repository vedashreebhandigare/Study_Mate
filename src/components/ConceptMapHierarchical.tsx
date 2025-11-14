/**
 * Hierarchical Tree Visualization for Concept Maps
 * Clean, top-down layout showing clear parent-child relationships
 */

import { useState, useRef, useEffect } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import { 
  ConceptNode, 
  ConceptEdge, 
  ConceptMapData,
  getNodeColor,
  getNodeIcon,
} from "../lib/concept-map-generator";
import { Search, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ConceptMapHierarchicalProps {
  data: ConceptMapData;
  documentTitle?: string;
}

export function ConceptMapHierarchical({ data, documentTitle }: ConceptMapHierarchicalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build hierarchy from flat graph
  const buildHierarchy = () => {
    // Find root nodes (nodes with most outgoing edges)
    const outgoingCounts = new Map<string, number>();
    data.edges.forEach(edge => {
      outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) || 0) + 1);
    });

    // Get root (node with most outgoing edges)
    let root = data.nodes[0];
    let maxOutgoing = 0;
    data.nodes.forEach(node => {
      const count = outgoingCounts.get(node.id) || 0;
      if (count > maxOutgoing) {
        maxOutgoing = count;
        root = node;
      }
    });

    return root;
  };

  // Get children of a node
  const getChildren = (nodeId: string, visited = new Set<string>()): ConceptNode[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const childIds = data.edges
      .filter(e => e.source === nodeId)
      .map(e => e.target);
    
    return childIds
      .map(id => data.nodes.find(n => n.id === id))
      .filter((n): n is ConceptNode => n !== undefined);
  };

  // Recursive tree component
  const renderTreeNode = (node: ConceptNode, visited = new Set<string>()) => {
    const children = getChildren(node.id, new Set(visited));
    const isSearchMatch = searchQuery && 
      (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
       node.definition.toLowerCase().includes(searchQuery.toLowerCase()));
    const isSelected = selectedNode === node.id;
    const isHovered = hoveredNode?.id === node.id;

    return (
      <TreeNode
        key={node.id}
        label={
          <div
            onClick={() => setSelectedNode(isSelected ? null : node.id)}
            onMouseEnter={() => setHoveredNode(node)}
            onMouseLeave={() => setHoveredNode(null)}
            className={`
              relative px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
              ${isSelected ? 'ring-2 ring-white shadow-2xl scale-105' : ''}
              ${isSearchMatch ? 'ring-2 ring-yellow-400' : ''}
              ${isHovered ? 'scale-105 shadow-xl' : 'shadow-lg'}
            `}
            style={{
              backgroundColor: getNodeColor(node.type) + '20',
              border: `2px solid ${getNodeColor(node.type)}80`,
              minWidth: '200px',
              maxWidth: '250px',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{getNodeIcon(node.type)}</span>
              <span className="text-white text-sm font-medium truncate">
                {node.label}
              </span>
            </div>
            <div className="text-xs text-white/70 line-clamp-2">
              {node.definition}
            </div>
            {node.metrics && Object.keys(node.metrics).length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/20 text-xs text-white/80">
                {Object.entries(node.metrics).slice(0, 2).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-white/60">{key}:</span> {value}
                  </div>
                ))}
              </div>
            )}
          </div>
        }
      >
        {children.length > 0 && children.map(child => 
          renderTreeNode(child, new Set([...visited, node.id]))
        )}
      </TreeNode>
    );
  };

  const root = buildHierarchy();

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
      </div>

      {/* Tree */}
      <div 
        className="w-full h-full overflow-auto p-8 pt-20"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        <Tree
          lineWidth="2px"
          lineColor="rgba(168, 85, 247, 0.3)"
          lineBorderRadius="10px"
          label={
            <div className="text-center">
              <div 
                className="inline-block px-6 py-4 rounded-2xl shadow-2xl"
                style={{
                  backgroundColor: getNodeColor(root.type) + '40',
                  border: `3px solid ${getNodeColor(root.type)}`,
                }}
              >
                <div className="text-3xl mb-2">{getNodeIcon(root.type)}</div>
                <div className="text-white text-lg font-bold mb-2">{root.label}</div>
                <div className="text-sm text-white/80 max-w-xs">{root.definition}</div>
              </div>
            </div>
          }
        >
          {getChildren(root.id).map(child => renderTreeNode(child, new Set([root.id])))}
        </Tree>
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
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 text-xs text-white/60">
        {data.nodes.length} concepts • {data.edges.length} relationships
      </div>
    </div>
  );
}
