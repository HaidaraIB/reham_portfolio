import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return <button className="theme-toggle" aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} onClick={e => { const box = e.currentTarget.getBoundingClientRect(); toggle({ x: box.left + box.width / 2, y: box.top + box.height / 2 }); }}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>;
}
