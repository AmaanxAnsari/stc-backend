
import InVanInventory from '../../models/admin/InVanInventoryModel.js';
import SpotOrderCart from '../../models/app/SpotOrderCartModel.js';
import { createRepository } from '../../utils/repository.js';

const spotCartRepo = createRepository(SpotOrderCart, {});

// Helper: Build cartItemId matching your context
const buildCartItemId = (productId, variantIndex = 0) =>
  `${productId}_variant_${variantIndex}`;

// Helper: Reserve stock in InVanInventory
const reserveStock = async (inventoryId, variantIndex, quantity) => {
  const inventory = await InVanInventory.findById(inventoryId);
  if (!inventory) throw new Error('Inventory not found');

  const variant = inventory.variants[variantIndex];
  if (!variant) throw new Error('Variant not found');

  const available = variant.onHand - variant.reserved;
  if (available < quantity) {
    throw new Error(`Only ${available} units available`);
  }

  variant.reserved += quantity;
  await inventory.save();
  return inventory;
};

// Helper: Release stock reservation
const releaseStock = async (inventoryId, variantIndex, quantity) => {
  const inventory = await InVanInventory.findById(inventoryId);
  if (!inventory) return;

  const variant = inventory.variants[variantIndex];
  if (variant) {
    variant.reserved = Math.max(0, variant.reserved - quantity);
    await inventory.save();
  }
};

// Get or create cart for driver+vehicle
export const getDriverCart = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const { vehicleId } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required',
      });
    }

    let cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart) {
      cart = new SpotOrderCart({
        driverId,
        vehicleId,
        items: [],
        customerDetails: {
          name: '',
          address: '',
          phone: '',
          customerType: 'Retailer',
          isNewCustomer: true,
        },
        paymentDetails: {
          method: 'Cash',
          transactionId: null,
          chequeNumber: null,
        },
        orderLocation: {
          routeId: null,
          routeName: null,
          stopNumber: null,
          stopLocation: null,
          coordinates: null,
        },
      });
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error('Error fetching driver cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error.message,
    });
  }
};

// Add/Update item in cart (matches updateCartItemQuantity in context)
export const updateCartItem = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const {
      vehicleId,
      productId,
      variantIndex = 0,
      quantity,
      productData,
    } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!vehicleId || !productId || quantity == null) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId, productId, and quantity are required',
      });
    }

    let cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart) {
      cart = new SpotOrderCart({
        driverId,
        vehicleId,
        items: [],
        customerDetails: {
          name: '',
          address: '',
          phone: '',
          customerType: 'Retailer',
          isNewCustomer: true,
        },
        paymentDetails: {
          method: 'Cash',
          transactionId: null,
          chequeNumber: null,
        },
        orderLocation: {
          routeId: null,
          routeName: null,
          stopNumber: null,
          stopLocation: null,
          coordinates: null,
        },
      });
    }

    // Get inventory from InVanInventory
    const inventory = await InVanInventory.findOne({
      vehicleId,
      productId,
      isDeleted: false,
      isActive: true,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in van inventory',
      });
    }

    const variant = inventory.variants[variantIndex];
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found',
      });
    }

    const cartItemId = buildCartItemId(productId, variantIndex);
    const existingIndex = cart.items.findIndex(
      (item) => item.cartItemId === cartItemId,
    );

    const currentCartQty =
      existingIndex >= 0 ? cart.items[existingIndex].cartQuantity : 0;
    const quantityDifference = quantity - currentCartQty;
    const availableStock = variant.onHand - variant.reserved;

    // Removing or setting to 0
    if (quantity <= 0) {
      if (existingIndex >= 0) {
        await releaseStock(inventory._id, variantIndex, currentCartQty);
        cart.items.splice(existingIndex, 1);
      }
    } else {
      // Adding or updating
      if (quantityDifference > 0 && quantityDifference > availableStock) {
        return res.status(400).json({
          success: false,
          message: `Only ${availableStock} units available in stock`,
        });
      }

      // Reserve/release stock based on difference
      if (quantityDifference > 0) {
        await reserveStock(inventory._id, variantIndex, quantityDifference);
      } else if (quantityDifference < 0) {
        await releaseStock(
          inventory._id,
          variantIndex,
          Math.abs(quantityDifference),
        );
      }

      if (existingIndex >= 0) {
        cart.items[existingIndex].cartQuantity = quantity;
        cart.items[existingIndex].addedAt = new Date();
      } else {
        const cartItem = {
          cartItemId,
          id: productId,
          inventoryId: inventory._id,
          productId,
          variantIndex,
          name: productData?.name || inventory.name,
          image: productData?.image || inventory.image || '',
          price:
            productData?.price ||
            variant.tierPricing?.inVanPrice ||
            variant.mrp,
          originalPrice: productData?.originalPrice || variant.mrp,
          quantity: productData?.quantity || variant.variantKey,
          category: productData?.category || inventory.category,
          cartQuantity: quantity,
          addedAt: new Date(),
        };
        cart.items.push(cartItem);
      }
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: quantity <= 0 ? 'Item removed' : 'Cart updated successfully',
      cart,
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update cart',
    });
  }
};

// Batch update variants (matches batchUpdateVariants in context)
export const batchUpdateVariants = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const { vehicleId, productId, variantUpdates, productData } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!vehicleId || !productId || !Array.isArray(variantUpdates)) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId, productId, and variantUpdates array required',
      });
    }

    let cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const inventory = await InVanInventory.findOne({
      vehicleId,
      productId,
      isDeleted: false,
      isActive: true,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in van inventory',
      });
    }

    // Process each variant update
    for (const { variantIndex, quantity } of variantUpdates) {
      const variant = inventory.variants[variantIndex];
      if (!variant) continue;

      const cartItemId = buildCartItemId(productId, variantIndex);
      const existingIndex = cart.items.findIndex(
        (item) => item.cartItemId === cartItemId,
      );

      const currentCartQty =
        existingIndex >= 0 ? cart.items[existingIndex].cartQuantity : 0;
      const quantityDifference = quantity - currentCartQty;
      const availableStock = variant.onHand - variant.reserved;

      if (quantity === 0 && existingIndex >= 0) {
        await releaseStock(inventory._id, variantIndex, currentCartQty);
        cart.items.splice(existingIndex, 1);
        continue;
      }

      if (quantity === 0 && existingIndex < 0) continue;

      if (quantityDifference > 0 && quantityDifference > availableStock) {
        console.warn(`Insufficient stock for variant ${variantIndex}`);
        continue;
      }

      if (quantityDifference > 0) {
        await reserveStock(inventory._id, variantIndex, quantityDifference);
      } else if (quantityDifference < 0) {
        await releaseStock(
          inventory._id,
          variantIndex,
          Math.abs(quantityDifference),
        );
      }

      if (existingIndex >= 0) {
        cart.items[existingIndex].cartQuantity = quantity;
        cart.items[existingIndex].addedAt = new Date();
      } else {
        const variantData = productData?.variants?.[variantIndex];
        cart.items.push({
          cartItemId,
          id: productId,
          inventoryId: inventory._id,
          productId,
          variantIndex,
          name: productData?.name || inventory.name,
          image:
            variantData?.images?.[0] ||
            productData?.image ||
            inventory.image ||
            '',
          price:
            variantData?.price ||
            variant.tierPricing?.inVanPrice ||
            variant.mrp,
          originalPrice: variantData?.originalPrice || variant.mrp,
          quantity: variantData?.quantity || variant.variantKey,
          category: productData?.category || inventory.category,
          cartQuantity: quantity,
          addedAt: new Date(),
        });
      }
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Variants updated successfully',
      cart,
    });
  } catch (error) {
    console.error('Error batch updating variants:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update variants',
    });
  }
};

// Clear cart
export const clearDriverCart = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const { vehicleId } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required',
      });
    }

    const cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Release all reservations
    for (const item of cart.items) {
      await releaseStock(
        item.inventoryId,
        item.variantIndex,
        item.cartQuantity,
      );
    }

    cart.items = [];
    cart.customerDetails = {
      name: '',
      address: '',
      phone: '',
      customerType: 'Retailer',
      isNewCustomer: true,
    };
    cart.paymentDetails = {
      method: 'Cash',
      transactionId: null,
      chequeNumber: null,
    };
    cart.orderLocation = {
      routeId: null,
      routeName: null,
      stopNumber: null,
      stopLocation: null,
      coordinates: null,
    };

    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
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

// Update customer details
export const updateCustomerDetails = async (req, res) => {
  try {
    const driverId = req.user?.id;
      const { vehicleId, customerDetails } = req.body;
      console.log('Body', req.body);
      console.log("DriverID",driverId)

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.customerDetails = { ...cart.customerDetails, ...customerDetails };
    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Customer details updated',
      cart,
    });
  } catch (error) {
    console.error('Error updating customer details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer details',
      error: error.message,
    });
  }
};

// Update payment details
export const updatePaymentDetails = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const { vehicleId, paymentDetails } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.paymentDetails = { ...cart.paymentDetails, ...paymentDetails };
    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Payment details updated',
      cart,
    });
  } catch (error) {
    console.error('Error updating payment details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment details',
      error: error.message,
    });
  }
};

// Update order location
export const updateOrderLocation = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const { vehicleId, orderLocation } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.orderLocation = { ...cart.orderLocation, ...orderLocation };
    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Order location updated',
      cart,
    });
  } catch (error) {
    console.error('Error updating order location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order location',
      error: error.message,
    });
  }
};

// Complete spot order (placeholder - you'll integrate with your order system)
export const completeSpotOrder = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const { vehicleId, orderNotes } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Process each item: convert reserved to sold, update onHand
    for (const item of cart.items) {
      const inventory = await InVanInventory.findById(item.inventoryId);
      if (inventory) {
        const variant = inventory.variants[item.variantIndex];
        if (variant) {
          variant.onHand -= item.cartQuantity;
          variant.sold += item.cartQuantity;
          variant.reserved -= item.cartQuantity;
          await inventory.save();
        }
      }
    }

    // Calculate totals
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.cartQuantity,
      0,
    );

    // Create order object (adapt to your Order model)
    const spotOrder = {
      orderId: `SPOT${Date.now()}`,
      orderType: 'on_spot',
      status: 'delivered',
      driverId,
      vehicleId,
      items: cart.items,
      customerDetails: cart.customerDetails,
      paymentDetails: {
        ...cart.paymentDetails,
        amount: totalAmount,
        status: 'Paid',
      },
      orderLocation: cart.orderLocation,
      totalAmount,
      orderNotes: orderNotes || '',
      completedAt: new Date(),
    };

    // Clear cart
    cart.items = [];
    cart.isActive = false;
    await cart.save();

    // TODO: Save spotOrder to your Order collection

    return res.status(201).json({
      success: true,
      message: 'Order completed successfully',
      order: spotOrder,
    });
  } catch (error) {
    console.error('Error completing spot order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete order',
      error: error.message,
    });
  }
};
