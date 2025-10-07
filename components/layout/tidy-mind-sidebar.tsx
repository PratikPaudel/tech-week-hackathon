"use client";

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ChevronLeft, Folder, HelpCircle, LogOut, Settings, Star, Tag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const supabase = createClient();

export function TidyMindSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    // Auto-collapse on tablet and mobile sizes
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1280) { // xl breakpoint - more aggressive auto-collapse
                setCollapsed(true);
            } else {
                setCollapsed(false);
            }
        };

        // Set initial state
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const navItems = [
        { href: '/dashboard', icon: Folder, label: 'All Folders' },
        { href: '/favorites', icon: Star, label: 'Favorites' },
        { href: '/tags', icon: Tag, label: 'Tags' },
    ];

    return (
        <aside className={cn("flex flex-col bg-sidebar border-r transition-all duration-200", collapsed ? "w-20" : "w-64")}>
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 relative">
                {/* Collapse Button - positioned absolutely */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-4 z-10 bg-sidebar border shadow-sm hover:shadow-md"
                >
                    <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                </Button>
                {navItems.map(item => (
                    <Link key={item.label} href={item.href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground">
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t">
                {!collapsed ? (
                    <div className="space-y-3">
                        {/* User Info with Popover */}
                        {user?.email && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start p-2 h-auto hover:bg-gray-100"
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                                                <p className="text-xs text-gray-500">Account Settings</p>
                                            </div>
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="end" side="right" sideOffset={8}>
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{user.email}</p>
                                                <p className="text-xs text-gray-500">Personal Account</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 my-3" />

                                        <div className="space-y-1">
                                            <Button variant="ghost" className="w-full justify-start h-8 px-2" disabled>
                                                <Settings className="h-4 w-4 mr-2" />
                                                <span className="text-sm">Account Settings</span>
                                                <span className="ml-auto text-xs text-gray-400">Soon</span>
                                            </Button>
                                            <Button variant="ghost" className="w-full justify-start h-8 px-2" disabled>
                                                <HelpCircle className="h-4 w-4 mr-2" />
                                                <span className="text-sm">Help & Support</span>
                                                <span className="ml-auto text-xs text-gray-400">Soon</span>
                                            </Button>

                                            <div className="border-t border-gray-100 my-2" />

                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={onSignOut}
                                            >
                                                <LogOut className="h-4 w-4 mr-2" />
                                                <span className="text-sm">Sign Out</span>
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}

                    </div>
                ) : (
                    /* Collapsed state - just icons */
                    <div className="space-y-2 flex flex-col items-center">
                        {user?.email && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-8 h-8">
                                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="end" side="right" sideOffset={8}>
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{user.email}</p>
                                                <p className="text-xs text-gray-500">Personal Account</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 my-3" />

                                        <div className="space-y-1">
                                            <Button variant="ghost" className="w-full justify-start h-8 px-2" disabled>
                                                <Settings className="h-4 w-4 mr-2" />
                                                <span className="text-sm">Account Settings</span>
                                                <span className="ml-auto text-xs text-gray-400">Soon</span>
                                            </Button>
                                            <Button variant="ghost" className="w-full justify-start h-8 px-2" disabled>
                                                <HelpCircle className="h-4 w-4 mr-2" />
                                                <span className="text-sm">Help & Support</span>
                                                <span className="ml-auto text-xs text-gray-400">Soon</span>
                                            </Button>

                                            <div className="border-t border-gray-100 my-2" />

                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={onSignOut}
                                            >
                                                <LogOut className="h-4 w-4 mr-2" />
                                                <span className="text-sm">Sign Out</span>
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}