import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!user) {
      setCart([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("cart")
      .select('*, products(*)')
      .eq("user_id", user.id);

    if (error) {
      console.error("fetchCart error:", error.message);
      setLoading(false);
      return;
    }

    setCart(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "You must login first",
        variant: "destructive"
      });
      return;
    }

    // Check existing
    const { data: existing } = await supabase
      .from("cart")
      .select("*, products(*)")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("cart")
        .update({
          quantity: existing.quantity + quantity
        })
        .eq("id", existing.id)
        .select("*, products(*)")
        .single();

      if (error) {
        console.error(error.message);
        return;
      }

      setCart(prev =>
        prev.map(item =>
          item.id === data.id ? data : item
        )
      );

      return;
    }

    const { data, error } = await supabase
      .from("cart")
      .insert({
        user_id: user.id,
        product_id: productId,
        quantity
      })
      .select(`
        *,
        products (*)
      `)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setCart(prev => [...prev, data]);
  };

  /**
   * Remove item
   */
  const removeFromCart = async (cartItemId) => {
    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("id", cartItemId);

    if (error) {
      console.error(error.message);
      return;
    }

    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  /**
   * Update quantity
   */
  const updateQuantity = async (cartItemId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(cartItemId);
    }

    const { data, error } = await supabase
      .from("cart")
      .update({ quantity })
      .eq("id", cartItemId)
      .select("*, products(*)")
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.id === cartItemId ? data : item
      )
    );
  };

  /**
   * Clear entire cart
   */
  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error(error.message);
      return;
    }

    setCart([]);
  };

  /**
   * Derived values
   */
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = cart.reduce((sum, item) => {
    const price =
      item.products?.price ||
      item.courses?.price ||
      0;

    return sum + price * item.quantity;
  }, 0);

  const value = {
    cart,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    refreshCart: fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
