import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import OrganDonationChatbot from "@/components/OrganDonationChatbot";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Heart, Users, MessageSquare, Plus, Share2, Bookmark } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Community = () => {
  const { toast } = useToast();
  const [showPostForm, setShowPostForm] = useState(false);
  const [activeReel, setActiveReel] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [postLikes, setPostLikes] = useState<Record<number, number>>({});
  const [likedReels, setLikedReels] = useState<Record<number, boolean>>({});
  const [reelLikes, setReelLikes] = useState<Record<number, number>>({});

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Post Shared!",
      description: "Your post has been shared with the community.",
    });
    setShowPostForm(false);
  };

  const reels = [
    {
      id: 1,
      author: "Dr. Sharma",
      authorImage: "🩺",
      title: "Understanding Organ Donation",
      description: "A quick guide to the organ donation process and its life-saving impact.",
      likes: 1234,
      comments: 89,
      shares: 234,
      image: "🫀",
    },
    {
      id: 2,
      author: "Priya Kumar",
      authorImage: "👩",
      title: "My Transplant Journey",
      description: "Sharing my story of receiving a second chance at life through organ donation.",
      likes: 2341,
      comments: 156,
      shares: 445,
      image: "💚",
    },
    {
      id: 3,
      author: "MOHAN Foundation",
      authorImage: "🏥",
      title: "Myths About Organ Donation",
      description: "Busting common misconceptions and spreading awareness.",
      likes: 3456,
      comments: 234,
      shares: 678,
      image: "💡",
    },
    {
      id: 4,
      author: "Rajesh Patel",
      authorImage: "👨",
      title: "Being a Living Donor",
      description: "My experience donating a kidney to save my brother's life.",
      likes: 4567,
      comments: 301,
      shares: 890,
      image: "❤️",
    },
  ];

  const posts = [
    {
      author: "Gift Your Organ",
      authorImage: "🎁",
      time: "2 hours ago",
      content: "Every 10 minutes, someone is added to the organ transplant waiting list. Register today and give the gift of life! 💚",
      image: "🏥",
      likes: 567,
      comments: 45,
      isLiked: false,
    },
    {
      author: "Organ India",
      authorImage: "🇮🇳",
      time: "5 hours ago",
      content: "Success story: Thanks to our network, a heart transplant was completed in record time, saving a 35-year-old father of two. #OrganDonation",
      image: "❤️‍🩹",
      likes: 892,
      comments: 67,
      isLiked: true,
    },
    {
      author: "Dr. Mehta",
      authorImage: "👨‍⚕️",
      time: "1 day ago",
      content: "Attended an incredible medical seminar on advances in transplant surgery. The future of organ donation is bright! 🌟",
      image: "🔬",
      likes: 445,
      comments: 34,
      isLiked: false,
    },
    {
      author: "Anita Desai",
      authorImage: "👩‍💼",
      time: "2 days ago",
      content: "Honored to volunteer at today's organ donation awareness camp. Met amazing people committed to saving lives! 🙏",
      image: "🤝",
      likes: 678,
      comments: 56,
      isLiked: true,
    },
  ];

  const handleReelScroll = (direction: 'up' | 'down') => {
    if (direction === 'down' && activeReel < reels.length - 1) {
      setActiveReel(activeReel + 1);
    } else if (direction === 'up' && activeReel > 0) {
      setActiveReel(activeReel - 1);
    }
  };

  const handlePostLike = (index: number, initialLikes: number) => {
    setLikedPosts(prev => {
      const newLiked = { ...prev };
      newLiked[index] = !newLiked[index];
      return newLiked;
    });
    
    setPostLikes(prev => {
      const newLikes = { ...prev };
      if (!newLikes[index]) newLikes[index] = initialLikes;
      newLikes[index] = likedPosts[index] ? newLikes[index] - 1 : newLikes[index] + 1;
      return newLikes;
    });
  };

  const handlePostComment = (author: string) => {
    toast({
      title: "Comment",
      description: `Opening comments for ${author}'s post`,
    });
  };

  const handleReelLike = (id: number, initialLikes: number) => {
    setLikedReels(prev => {
      const newLiked = { ...prev };
      newLiked[id] = !newLiked[id];
      return newLiked;
    });
    
    setReelLikes(prev => {
      const newLikes = { ...prev };
      if (!newLikes[id]) newLikes[id] = initialLikes;
      newLikes[id] = likedReels[id] ? newLikes[id] - 1 : newLikes[id] + 1;
      return newLikes;
    });
  };

  const handleReelComment = (title: string) => {
    toast({
      title: "Comment",
      description: `Opening comments for "${title}"`,
    });
  };

  const handleReelShare = (title: string) => {
    toast({
      title: "Shared!",
      description: `"${title}" has been shared`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <OrganDonationChatbot />

      <div className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Community <span className="bg-gradient-hero bg-clip-text text-transparent">Feed</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Share stories, inspire others, and be part of a life-saving movement.
            </p>
          </div>

          {/* Create Post Button */}
          <div className="flex justify-center mb-8">
            <Button 
              onClick={() => setShowPostForm(!showPostForm)} 
              size="lg"
              className="bg-gradient-primary text-primary-foreground shadow-medium gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Post
            </Button>
          </div>

          {/* Post Creation Form */}
          {showPostForm && (
            <Card className="p-6 mb-8 shadow-strong border-primary/20 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold mb-4">Share Your Story</h3>
              <form onSubmit={handlePostSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="post-content">What's on your mind?</Label>
                  <Textarea
                    id="post-content"
                    placeholder="Share your thoughts, experiences, or insights with the community..."
                    className="min-h-[120px] mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="post-image">Add Image (optional)</Label>
                  <Input id="post-image" type="file" accept="image/*" className="mt-2" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowPostForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-primary text-primary-foreground">
                    Publish Post
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Reels Section - Instagram-style */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Heart className="h-6 w-6 text-primary" />
                  Stories & Reels
                </h2>
              </div>

              <div className="relative">
                <Card className="overflow-hidden shadow-strong bg-gradient-subtle">
                  <div className="relative h-[500px] sm:h-[550px] md:h-[600px] flex items-center justify-center">
                    {/* Reel Content */}
                    <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
                    <div className="relative z-10 text-center p-4 sm:p-6 md:p-8">
                      <div className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6">{reels[activeReel].image}</div>
                      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-full flex items-center justify-center text-xl sm:text-2xl">
                          {reels[activeReel].authorImage}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm sm:text-base text-foreground">{reels[activeReel].author}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Community Member</p>
                        </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-foreground px-2">{reels[activeReel].title}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto mb-4 sm:mb-6 px-2">
                        {reels[activeReel].description}
                      </p>
                    </div>

                    {/* Navigation Arrows */}
                    {activeReel > 0 && (
                      <button
                        onClick={() => handleReelScroll('up')}
                        className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-smooth shadow-medium"
                      >
                        ▲
                      </button>
                    )}
                    {activeReel < reels.length - 1 && (
                      <button
                        onClick={() => handleReelScroll('down')}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-smooth shadow-medium"
                      >
                        ▼
                      </button>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute right-2 sm:right-4 bottom-16 sm:bottom-20 flex flex-col gap-2 sm:gap-4 z-20">
                      <button 
                        onClick={() => handleReelLike(reels[activeReel].id, reels[activeReel].likes)}
                        className="w-12 h-12 sm:w-14 sm:h-14 bg-background/90 backdrop-blur-sm rounded-full flex flex-col items-center justify-center hover:bg-background hover:scale-110 transition-smooth shadow-strong"
                      >
                        <Heart 
                          className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
                            likedReels[reels[activeReel].id] ? 'fill-primary text-primary' : 'text-foreground'
                          }`}
                        />
                        <span className="text-[10px] sm:text-xs font-semibold text-foreground mt-0.5">
                          {reelLikes[reels[activeReel].id] ?? reels[activeReel].likes}
                        </span>
                      </button>
                      <button 
                        onClick={() => handleReelComment(reels[activeReel].title)}
                        className="w-12 h-12 sm:w-14 sm:h-14 bg-background/90 backdrop-blur-sm rounded-full flex flex-col items-center justify-center hover:bg-background hover:scale-110 transition-smooth shadow-strong"
                      >
                        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                        <span className="text-[10px] sm:text-xs font-semibold text-foreground mt-0.5">
                          {reels[activeReel].comments}
                        </span>
                      </button>
                      <button 
                        onClick={() => handleReelShare(reels[activeReel].title)}
                        className="w-12 h-12 sm:w-14 sm:h-14 bg-background/90 backdrop-blur-sm rounded-full flex flex-col items-center justify-center hover:bg-background hover:scale-110 transition-smooth shadow-strong"
                      >
                        <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                        <span className="text-[10px] sm:text-xs font-semibold text-foreground mt-0.5">
                          {reels[activeReel].shares}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Reel Indicators */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    {reels.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveReel(index)}
                        className={`w-1 h-8 rounded-full transition-smooth ${
                          index === activeReel ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </Card>
              </div>
            </section>

            {/* Posts Feed - Instagram-style */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-secondary" />
                  Community Posts
                </h2>
              </div>

              <div className="space-y-6">
                {posts.map((post, index) => (
                  <Card key={index} className="overflow-hidden shadow-medium hover:shadow-strong transition-smooth">
                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center text-xl">
                          {post.authorImage}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{post.author}</p>
                          <p className="text-xs text-muted-foreground">{post.time}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">•••</Button>
                    </div>

                    {/* Post Image */}
                    <div className="aspect-square bg-gradient-subtle flex items-center justify-center text-8xl border-y border-border">
                      {post.image}
                    </div>

                    {/* Post Actions */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <button 
                            onClick={() => handlePostLike(index, post.likes)}
                            className="flex items-center gap-2 hover:text-primary transition-base group"
                          >
                            <Heart 
                              className={`h-6 w-6 transition-all group-hover:scale-110 ${
                                likedPosts[index] ? 'fill-primary text-primary' : 'text-foreground'
                              }`}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {postLikes[index] ?? post.likes}
                            </span>
                          </button>
                          <button 
                            onClick={() => handlePostComment(post.author)}
                            className="flex items-center gap-2 hover:text-secondary transition-base group"
                          >
                            <MessageSquare className="h-6 w-6 text-foreground transition-all group-hover:scale-110" />
                            <span className="text-sm font-medium text-foreground">{post.comments}</span>
                          </button>
                          <button className="hover:text-accent transition-base group">
                            <Share2 className="h-6 w-6 text-foreground transition-all group-hover:scale-110" />
                          </button>
                        </div>
                        <button className="hover:text-accent transition-base group">
                          <Bookmark className="h-6 w-6 text-foreground transition-all group-hover:scale-110" />
                        </button>
                      </div>

                      {/* Post Content */}
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-semibold">{post.author}</span>{" "}
                        {post.content}
                      </p>

                      {/* View Comments */}
                      <button 
                        onClick={() => handlePostComment(post.author)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-base"
                      >
                        View all {post.comments} comments
                      </button>

                      {/* Comment Input */}
                      <div className="pt-3 border-t border-border">
                        <Input 
                          placeholder="Add a comment..." 
                          className="border-0 focus-visible:ring-0 px-0 bg-transparent text-sm"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Community;
