import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Menu, X, Moon, Sun, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-medium transition-smooth group-hover:scale-105 group-hover:shadow-glow">
              <Heart className="h-6 w-6 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              OrganConnect
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-foreground hover:text-primary transition-base font-medium">
              Home
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-base font-medium">
              About
            </Link>
            <Link to="/community" className="text-foreground hover:text-primary transition-base font-medium">
              Community
            </Link>
            <Link to="/events" className="text-foreground hover:text-primary transition-base font-medium">
              Events
            </Link>
            <Link to="/resources" className="text-foreground hover:text-primary transition-base font-medium">
              Resources
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            {user ? (
              <>
                {/* Show Donate button only for donors and admins */}
                {(user.role === 'donor' || user.role === 'admin') && (
                  <Link to="/donate">
                    <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth">
                      Donate
                    </Button>
                  </Link>
                )}
                
                {/* Show Post Requirement button only for hospitals and admins */}
                {(user.role === 'hospital' || user.role === 'admin') && (
                  <Link to="/recipient-portal">
                    <Button className="bg-gradient-primary text-primary-foreground shadow-medium hover:shadow-glow transition-smooth">
                      Post Requirement
                    </Button>
                  </Link>
                )}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={logout}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-smooth"
                  title={`Logged in as ${user.name} (${user.role})`}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-primary text-primary-foreground shadow-medium hover:shadow-glow transition-smooth">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-base"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="text-foreground hover:text-primary transition-base font-medium px-4 py-2"
              >
                Home
              </Link>
              <Link
                to="/about"
                onClick={() => setIsOpen(false)}
                className="text-foreground hover:text-primary transition-base font-medium px-4 py-2"
              >
                About
              </Link>
              <Link
                to="/community"
                onClick={() => setIsOpen(false)}
                className="text-foreground hover:text-primary transition-base font-medium px-4 py-2"
              >
                Community
              </Link>
              <Link
                to="/events"
                onClick={() => setIsOpen(false)}
                className="text-foreground hover:text-primary transition-base font-medium px-4 py-2"
              >
                Events
              </Link>
              <Link
                to="/resources"
                onClick={() => setIsOpen(false)}
                className="text-foreground hover:text-primary transition-base font-medium px-4 py-2"
              >
                Resources
              </Link>
              <div className="flex flex-col gap-2 px-4 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5 mr-2" /> : <Moon className="h-5 w-5 mr-2" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </Button>
                
                {user ? (
                  <>
                    <div className="text-sm text-muted-foreground px-2 py-1">
                      Logged in as {user.name} ({user.role})
                    </div>
                    {(user.role === 'donor' || user.role === 'admin') && (
                      <Link to="/donate" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                          Donate
                        </Button>
                      </Link>
                    )}
                    {(user.role === 'hospital' || user.role === 'admin') && (
                      <Link to="/recipient-portal" onClick={() => setIsOpen(false)}>
                        <Button className="w-full bg-gradient-primary text-primary-foreground shadow-medium">
                          Post Requirement
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                        Login
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full bg-gradient-primary text-primary-foreground shadow-medium">
                        Register
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
