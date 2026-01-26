
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			'xs': '475px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
		},
		extend: {
			fontFamily: {
				display: ['var(--font-display)'],
				body: ['var(--font-body)'],
				sans: ['var(--font-body)'],
				mono: ['var(--font-mono)'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				brand: {
					DEFAULT: 'hsl(var(--brand))',
					foreground: 'hsl(var(--brand-foreground))'
				},
				// Work Order Status Colors
				status: {
					open: 'hsl(var(--status-open))',
					assigned: 'hsl(var(--status-assigned))',
					'in-progress': 'hsl(var(--status-in-progress))',
					completed: 'hsl(var(--status-completed))',
					cancelled: 'hsl(var(--status-cancelled))',
					overdue: 'hsl(var(--status-overdue))',
				},
				// Equipment Status Colors
				equipment: {
					operational: 'hsl(var(--equipment-operational))',
					maintenance: 'hsl(var(--equipment-maintenance))',
					repair: 'hsl(var(--equipment-repair))',
					retired: 'hsl(var(--equipment-retired))',
				},
				// Priority Colors
				priority: {
					low: 'hsl(var(--priority-low))',
					medium: 'hsl(var(--priority-medium))',
					high: 'hsl(var(--priority-high))',
					critical: 'hsl(var(--priority-critical))',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			spacing: {
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
				'content': 'var(--content-padding)',
				'content-sm': 'var(--content-padding-sm)',
				'content-xs': 'var(--content-padding-xs)',
				'content-lg': 'var(--content-padding-lg)',
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'DEFAULT': 'var(--shadow)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				'xl': 'var(--shadow-xl)',
				// Elevation system
				'elevation-1': 'var(--shadow-elevation-1)',
				'elevation-2': 'var(--shadow-elevation-2)',
				'elevation-3': 'var(--shadow-elevation-3)',
				'elevation-4': 'var(--shadow-elevation-4)',
				// Colored shadows
				'primary': 'var(--shadow-primary)',
				'primary-lg': 'var(--shadow-primary-lg)',
				'success': 'var(--shadow-success)',
				'warning': 'var(--shadow-warning)',
				'destructive': 'var(--shadow-destructive)',
				// Card states
				'card': 'var(--shadow-card)',
				'card-hover': 'var(--shadow-card-hover)',
				'card-active': 'var(--shadow-card-active)',
			},
			zIndex: {
				'dropdown': 'var(--z-dropdown)',
				'sticky': 'var(--z-sticky)',
				'fixed': 'var(--z-fixed)',
				'modal-backdrop': 'var(--z-modal-backdrop)',
				'modal': 'var(--z-modal)',
				'popover': 'var(--z-popover)',
				'tooltip': 'var(--z-tooltip)',
				'toast': 'var(--z-toast)',
			},
			fontSize: {
				'xs': ['var(--font-size-xs)', { lineHeight: 'var(--line-height-tight)' }],
				'sm': ['var(--font-size-sm)', { lineHeight: 'var(--line-height-snug)' }],
				'base': ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
				'lg': ['var(--font-size-lg)', { lineHeight: 'var(--line-height-normal)' }],
				'xl': ['var(--font-size-xl)', { lineHeight: 'var(--line-height-normal)' }],
				'2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-snug)' }],
				'3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
				'4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }],
				'5xl': ['var(--font-size-5xl)', { lineHeight: '1.1' }],
			},
			lineHeight: {
				'tight': 'var(--line-height-tight)',
				'snug': 'var(--line-height-snug)',
				'normal': 'var(--line-height-normal)',
				'relaxed': 'var(--line-height-relaxed)',
				'loose': 'var(--line-height-loose)',
			},
			transitionDuration: {
				'fast': 'var(--duration-fast)',
				'normal': 'var(--duration-normal)',
				'slow': 'var(--duration-slow)',
			},
			transitionTimingFunction: {
				'ease': 'var(--easing-ease)',
				'ease-in': 'var(--easing-ease-in)',
				'ease-out': 'var(--easing-ease-out)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				// Page transition animations
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-out': {
					from: { opacity: '1' },
					to: { opacity: '0' }
				},
				'slide-in-right': {
					from: { transform: 'translateX(100%)', opacity: '0' },
					to: { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-out-left': {
					from: { transform: 'translateX(0)', opacity: '1' },
					to: { transform: 'translateX(-100%)', opacity: '0' }
				},
				'slide-in-left': {
					from: { transform: 'translateX(-100%)', opacity: '0' },
					to: { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-out-right': {
					from: { transform: 'translateX(0)', opacity: '1' },
					to: { transform: 'translateX(100%)', opacity: '0' }
				},
				// Bottom sheet animation
				'slide-up': {
					from: { transform: 'translateY(100%)' },
					to: { transform: 'translateY(0)' }
				},
				'slide-down': {
					from: { transform: 'translateY(0)' },
					to: { transform: 'translateY(100%)' }
				},
				// Stagger animation for lists
				'stagger-in': {
					from: { opacity: '0', transform: 'translateY(8px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				// Skeleton shimmer
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				// Pulse for status changes
				'status-pulse': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				// Page transitions
				'fade-in': 'fade-in 0.2s ease-out',
				'fade-out': 'fade-out 0.2s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-left': 'slide-out-left 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				// Bottom sheet
				'slide-up': 'slide-up 0.3s ease-out',
				'slide-down': 'slide-down 0.3s ease-out',
				// List stagger
				'stagger-in': 'stagger-in 0.3s ease-out forwards',
				// Skeleton
				'shimmer': 'shimmer 2s infinite linear',
				// Status pulse
				'status-pulse': 'status-pulse 0.5s ease-in-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
