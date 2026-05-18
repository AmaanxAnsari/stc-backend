import Cart from '../../models/app/CartModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import { createRepository } from '../../utils/repository.js';

const cartRepo = createRepository(Cart, {});

// Add to cart with inventory validation
export const addToCart = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user || {};
    if (!userId || !userRole)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { inventoryId, productId, variantIndex = 0, quantity = 1 } = req.body;

    if (!inventoryId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'inventoryId and productId are required',
      });
    }

    // Fetch inventory
    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      productId,
      isDeleted: false,
      isActive: true,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in inventory',
      });
    }

    // Get variant
    const variant = inventory.variants[variantIndex];
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found',
      });
    }

    // Check stock availability
    if (variant.onHand < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.onHand} units available in stock`,
      });
    }

    // Get role-based price
    const price = variant.tierPricing?.[userRole] || variant.mrp;
    const cartItemId = `${inventoryId}_${productId}_variant_${variantIndex}`;

    let cart = await Cart.findOne({ userId, userRole });
    if (!cart) {
      cart = new Cart({ userId, userRole, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.cartItemId === cartItemId,
    );

    if (existingIndex >= 0) {
      const newQuantity = cart.items[existingIndex].cartQuantity + quantity;

      // Check if new quantity exceeds stock
      if (variant.onHand < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant.onHand} units available in stock`,
        });
      }

      cart.items[existingIndex].cartQuantity = newQuantity;
      cart.items[existingIndex].price = price;
      cart.items[existingIndex].availableStock = variant.onHand;
      cart.items[existingIndex].inStock = variant.inStock;
      cart.items[existingIndex].addedAt = new Date();
    } else {
      cart.items.unshift({
        cartItemId,
        inventoryId,
        productId,
        variantIndex,
        name: inventory.name,
        image: inventory.image || '',
        price,
        originalPrice: variant.mrp,
        quantity: variant.variantKey,
        category: inventory.category,
        inStock: variant.inStock,
        cartQuantity: quantity,
        availableStock: variant.onHand,
        addedAt: new Date(),
      });
    }

    await cart.save();

    return res.status(201).json({
      success: true,
      message: 'Cart updated successfully',
      cart,
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cart',
      error: error.message,
    });
  }
};

// Update cart item quantity with stock validation
export const updateCartItemQuantity = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user || {};
    if (!userId || !userRole)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { cartItemId, quantity } = req.body;
    if (!cartItemId || quantity == null) {
      return res.status(400).json({
        success: false,
        message: 'cartItemId and quantity required',
      });
    }

    let cart = await Cart.findOne({ userId, userRole });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(
      (item) => item.cartItemId === cartItemId,
    );
    if (itemIndex === -1)
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });

    const item = cart.items[itemIndex];

    if (quantity > 0) {
      // Validate stock before updating
      const inventory = await AdminInventory.findById(item.inventoryId);
      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory not found',
        });
      }

      const variant = inventory.variants[item.variantIndex];
      if (variant.onHand < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant.onHand} units available in stock`,
        });
      }

      cart.items[itemIndex].cartQuantity = quantity;
      cart.items[itemIndex].availableStock = variant.onHand;
      cart.items[itemIndex].inStock = variant.inStock;
      cart.items[itemIndex].addedAt = new Date();
    } else {
      cart.items.splice(itemIndex, 1);
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Cart item updated',
      cart,
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message,
    });
  }
};

// Remove from cart
export const removeFromCart = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user || {};
    if (!userId || !userRole)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { cartItemId } = req.params;
    if (!cartItemId)
      return res.status(400).json({
        success: false,
        message: 'cartItemId is required',
      });

    let cart = await Cart.findOne({ userId, userRole });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(
      (item) => item.cartItemId === cartItemId,
    );
    if (itemIndex === -1)
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });

    cart.items.splice(itemIndex, 1);
    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart,
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove item',
      error: error.message,
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user || {};
    if (!userId || !userRole)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const cart = await Cart.findOneAndUpdate(
      { userId, userRole },
      { items: [] },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart,
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message,
    });
  }
};

// Get cart
export const getCart = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user || {};
    if (!userId || !userRole)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await cartRepo.getAll({
      filter: { userId, userRole },
      projection: { items: 1, _id: 0 },
      limit: 1,
      page: 1,
      sort: {},
    });

    if (!result.success) {
      return res.status(result.status || 500).json(result);
    }

    const cart = result.data[0] || { items: [] };
    return res.status(200).json({ success: true, items: cart.items });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error.message,
    });
  }
};

