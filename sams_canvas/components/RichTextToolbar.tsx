import React from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Type, Palette, Undo, Redo 
} from 'lucide-react';
import { FONTS } from '../constants';
import { FontFamily } from '../types';

interface RichTextToolbarProps {
  onCommand: (command: string, value?: string) => void;
  activeFont: FontFamily;
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ onCommand, activeFont }) => {
  
  const Button: React.FC<{ 
    onClick: () => void; 
    children: React.ReactNode; 
    title?: string;
    isActive?: boolean 
  }> = ({ onClick, children, title, isActive }) => (
    <button
      onClick={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-2 rounded hover:bg-purple-100 transition-colors ${isActive ? 'bg-purple-200 text-purple-700' : 'text-purple-600 hover:text-purple-900'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-purple-200 sticky top-0 z-10 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
      <div className="flex items-center space-x-1 border-r border-purple-200 pr-2 mr-1">
        <select 
          className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer text-purple-700 font-medium w-32 focus:text-purple-900"
          value={activeFont}
          onChange={(e) => onCommand('fontName', e.target.value)}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} className="bg-white text-purple-900">{f.name}</option>
          ))}
        </select>
        
        <div className="w-px h-6 bg-purple-200 mx-2"></div>
        
        <select 
          className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer text-purple-700 font-medium w-16 focus:text-purple-900"
          onChange={(e) => onCommand('fontSize', e.target.value)}
          defaultValue="3"
        >
          <option value="1" className="bg-white text-purple-900">Small</option>
          <option value="3" className="bg-white text-purple-900">Normal</option>
          <option value="5" className="bg-white text-purple-900">Large</option>
          <option value="7" className="bg-white text-purple-900">Huge</option>
        </select>
      </div>

      <div className="flex items-center space-x-1 border-r border-purple-200 pr-2 mr-1">
        <Button onClick={() => onCommand('bold')} title="Bold"><Bold size={18} /></Button>
        <Button onClick={() => onCommand('italic')} title="Italic"><Italic size={18} /></Button>
        <Button onClick={() => onCommand('underline')} title="Underline"><Underline size={18} /></Button>
        <div className="relative group">
            <Button onClick={() => {}} title="Color"><Palette size={18} /></Button>
            <input 
              type="color" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={(e) => onCommand('foreColor', e.target.value)}
            />
        </div>
      </div>

      <div className="flex items-center space-x-1 border-r border-purple-200 pr-2 mr-1">
        <Button onClick={() => onCommand('justifyLeft')} title="Align Left"><AlignLeft size={18} /></Button>
        <Button onClick={() => onCommand('justifyCenter')} title="Align Center"><AlignCenter size={18} /></Button>
        <Button onClick={() => onCommand('justifyRight')} title="Align Right"><AlignRight size={18} /></Button>
        <Button onClick={() => onCommand('justifyFull')} title="Justify"><AlignJustify size={18} /></Button>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button onClick={() => onCommand('undo')} title="Undo"><Undo size={18} /></Button>
        <Button onClick={() => onCommand('redo')} title="Redo"><Redo size={18} /></Button>
      </div>
    </div>
  );
};

export default RichTextToolbar;