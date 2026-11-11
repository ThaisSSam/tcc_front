import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  LayoutDashboard, 
  Car, 
  Route, 
  Map, 
  Users, 
  Settings, 
  Power, 
  User, 
  Calculator,
  Menu,
  ChevronLeft,
  Coins,
  Receipt
} from 'lucide-react';
import { cn } from '../lib/utils';

const sidebarItemVariants = cva(
  'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group whitespace-nowrap overflow-hidden',
  {
    variants: {
      variant: {
        default: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40',
        active: 'text-blue-400 bg-blue-500/10 font-semibold border-r-2 border-blue-500 rounded-r-none lg:rounded-xl lg:border-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface SidebarItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarItemVariants> {  
  icon: React.ComponentType<import("lucide-react").LucideProps>; 
  children: React.ReactNode;
  isOpen?: boolean;
}

const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, variant, icon: Icon, children, isOpen = true, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(sidebarItemVariants({ variant, className }), !isOpen && "justify-center px-0")}
        title={!isOpen && typeof children === "string" ? children : undefined}
        {...props}
      >      
        {Icon && <Icon size={18} className="flex-shrink-0" />}
        {isOpen && <span className="transition-opacity duration-200">{children}</span>}
      </button>
    );
  },
);
SidebarItem.displayName = 'SidebarItem';

export interface SidebarProps {
  currentPath?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onNavigate?: (path: string) => void;
  onLogout?: () => Promise<void> | void;
}

export default function SidebarComponent({ 
  currentPath = '/home', 
  isOpen = true,
  onToggle,
  onNavigate, 
  onLogout 
}: SidebarProps) {
  
  return (
    <aside 
      className={cn(
        "bg-slate-900 border-r border-slate-700/70 min-h-screen flex flex-col justify-between p-3 font-sans text-white shadow-lg select-none transition-all duration-300 ease-in-out flex-shrink-0 z-30",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div>
        {/* CABEÇALHO COM EXPANDIR / RECOLHER */}
        <div className="flex items-center justify-between px-1 py-3 mb-2">
          {isOpen ? (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 bg-[#4531f7] rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                  <Calculator size={16} className="text-white" />
                </div>
                <div className="overflow-hidden leading-tight">
                  <h2 className="font-bold text-xs text-slate-100 truncate">Calculadora Trajeto</h2>
                  <p className="text-[9px] text-slate-500 truncate">Planejamento Viagens</p>
                </div>
              </div>

              <button
                onClick={onToggle}
                type="button"
                title="Recolher menu"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <button
                type="button"
                onClick={onToggle}
                title="Expandir menu"
                className="w-9 h-9 bg-[#4531f7] hover:bg-[#3925e0] rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Menu size={18} className="text-white" />
              </button>
            </div>
          )}
        </div>
        
        <hr className="border-slate-700/60 mb-3"/>

        {/* NAVEGAÇÃO PRINCIPAL */}
        <div className="space-y-1 mb-6">
          {isOpen && (
            <p className="text-[10px] font-bold tracking-wider text-slate-500 px-3 mb-2 uppercase">Principal</p>
          )}
          <SidebarItem 
            icon={LayoutDashboard} 
            isOpen={isOpen}
            variant={currentPath === '/home' ? 'active' : 'default'}
            onClick={() => onNavigate?.('/home')}
          >
            Início
          </SidebarItem>
          <SidebarItem 
            icon={Car} 
            isOpen={isOpen}
            variant={currentPath.startsWith('/veiculos') ? 'active' : 'default'}
            onClick={() => onNavigate?.('/veiculos')}
          >
            Veículos
          </SidebarItem>
          <SidebarItem 
            icon={Route} 
            isOpen={isOpen}
            variant={currentPath.startsWith('/rotas') ? 'active' : 'default'}
            onClick={() => onNavigate?.('/rotas')}
          >
            Rotas
          </SidebarItem>
          <SidebarItem 
            icon={Map} 
            isOpen={isOpen}
            variant={currentPath === '/mapa' ? 'active' : 'default'}
            onClick={() => onNavigate?.('/mapa')}
          >
            Mapa
          </SidebarItem>
        </div>
      </div>

      {/* RODAPÉ DO USUÁRIO NAVEGÁVEL */}
      <div className={cn("border-t border-slate-700/60 pt-3 flex items-center justify-between px-1", !isOpen && "flex-col gap-2")}>
        <button
          type="button"
          onClick={() => onNavigate?.('/perfil')}
          title="Ver Meu Perfil"
          className={cn(
            "flex items-center gap-2 overflow-hidden text-left p-1 rounded-xl transition-all cursor-pointer group",
            currentPath === '/perfil' 
              ? "bg-blue-500/10 border border-blue-500/30" 
              : "hover:bg-slate-800/60",
            !isOpen && "justify-center w-full p-0"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors",
            currentPath === '/perfil'
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-blue-500/20 text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white"
          )}>
            <User size={15} />            
          </div>
          {isOpen && (
            <div className="overflow-hidden leading-tight flex-1">
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-white truncate">Thais</h4>
              <p className="text-[9px] text-slate-500 group-hover:text-slate-400 truncate">Administrador</p>
            </div>
          )}
        </button>

        <button 
          onClick={onLogout}
          type="button"
          title="Sair"
          className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/50 flex-shrink-0"
        >
          <Power size={15} className="text-[#9e2b2b]" />
        </button>
      </div>
    </aside>
  );
}