import productsData from "../mockData/products.json";
import React from "react";
import Error from "@/components/ui/Error";

class ProductService {
  constructor() {
    this.products = [...productsData];
  }

  async getAll() {
    await this.delay();
    return [...this.products];
  }

  async getById(id) {
    await this.delay();
    const product = this.products.find(p => p.id === id);
    if (!product) {
      throw new Error('Product not found');
    }
    return { ...product };
  }

async create(productData) {
    await this.delay();
    
    // Validate required fields
    if (!productData.name || !productData.price || productData.stock === undefined) {
      throw new Error('Name, price, and stock are required fields');
    }

    // Validate data types and constraints
    if (productData.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (productData.stock < 0) {
      throw new Error('Stock cannot be negative');
    }

const newProduct = {
      id: this.getNextId(),
      ...productData,
      price: parseFloat(productData.price),
      purchasePrice: parseFloat(productData.purchasePrice) || 0,
      discountValue: parseFloat(productData.discountValue) || 0,
      minSellingPrice: parseFloat(productData.minSellingPrice) || 0,
      profitMargin: parseFloat(productData.profitMargin) || 0,
      stock: parseInt(productData.stock),
      minStock: productData.minStock ? parseInt(productData.minStock) : 10,
      isActive: productData.isActive !== undefined ? productData.isActive : true
    };
    
    this.products.push(newProduct);
    return { ...newProduct };
  }

  async update(id, productData) {
    await this.delay();
    
    const index = this.products.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      throw new Error('Product not found');
    }

    // Validate if provided
    if (productData.price !== undefined && productData.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (productData.stock !== undefined && productData.stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    // Preserve existing ID
    const updatedProduct = { 
      ...this.products[index], 
      ...productData, 
      id: this.products[index].id 
    };
    
    this.products[index] = updatedProduct;
    return { ...updatedProduct };
  }

  async delete(id) {
    await this.delay();
    
    const index = this.products.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      throw new Error('Product not found');
    }
    
    this.products.splice(index, 1);
    return true;
  }

  async getByBarcode(barcode) {
    await this.delay();
    const product = this.products.find(p => p.barcode === barcode && p.isActive);
    if (!product) {
      throw new Error('Product not found');
    }
    return { ...product };
  }

  getNextId() {
    const maxId = this.products.reduce((max, product) => 
      product.id > max ? product.id : max, 0);
    return maxId + 1;
  }

async bulkUpdatePrices(updateData) {
    await this.delay(500); // Longer delay for bulk operations
    
    const validation = this.validateBulkPriceUpdate(updateData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    let filteredProducts = [...this.products];
    
    // Filter by category
    if (updateData.category !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.category === updateData.category);
    }
    
    // Filter by stock if enabled
    if (updateData.applyToLowStock) {
      filteredProducts = filteredProducts.filter(p => p.stock <= updateData.stockThreshold);
    }

    let updatedCount = 0;
    
    // Apply price updates
    filteredProducts.forEach(product => {
      const originalPrice = product.price;
      let newPrice = originalPrice;
      
      switch (updateData.strategy) {
        case 'percentage':
          const percentage = parseFloat(updateData.value) || 0;
          newPrice = originalPrice * (1 + percentage / 100);
          break;
        case 'fixed':
          const fixedAmount = parseFloat(updateData.value) || 0;
          newPrice = originalPrice + fixedAmount;
          break;
        case 'range':
          const minPrice = parseFloat(updateData.minPrice) || 0;
          const maxPrice = parseFloat(updateData.maxPrice) || originalPrice;
          newPrice = Math.min(Math.max(originalPrice, minPrice), maxPrice);
          break;
      }

      // Apply min/max constraints if specified
      if (updateData.minPrice && newPrice < parseFloat(updateData.minPrice)) {
        newPrice = parseFloat(updateData.minPrice);
      }
      if (updateData.maxPrice && newPrice > parseFloat(updateData.maxPrice)) {
        newPrice = parseFloat(updateData.maxPrice);
      }

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100;
      
      // Only update if price actually changed
      if (Math.abs(newPrice - originalPrice) > 0.01) {
        const productIndex = this.products.findIndex(p => p.id === product.id);
        if (productIndex !== -1) {
          this.products[productIndex] = {
            ...this.products[productIndex],
            previousPrice: originalPrice,
            price: newPrice
          };
          updatedCount++;
        }
      }
    });

    return {
      updatedCount,
      totalFiltered: filteredProducts.length,
      strategy: updateData.strategy
    };
  }

  validateBulkPriceUpdate(updateData) {
    if (!updateData.strategy) {
      return { isValid: false, error: 'Update strategy is required' };
    }

    if (updateData.strategy === 'range') {
      if (!updateData.minPrice || !updateData.maxPrice) {
        return { isValid: false, error: 'Both minimum and maximum prices are required for range strategy' };
      }
      if (parseFloat(updateData.minPrice) >= parseFloat(updateData.maxPrice)) {
        return { isValid: false, error: 'Minimum price must be less than maximum price' };
      }
    } else {
      if (!updateData.value) {
        return { isValid: false, error: 'Update value is required' };
      }
      if (isNaN(parseFloat(updateData.value))) {
        return { isValid: false, error: 'Update value must be a valid number' };
      }
    }

    return { isValid: true };
  }

delay(ms = 150) { // Reduced delay for faster perceived performance
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Calculate profit metrics for a product
  calculateProfitMetrics(productData) {
    const price = parseFloat(productData.price) || 0;
    const purchasePrice = parseFloat(productData.purchasePrice) || 0;
    const discountValue = parseFloat(productData.discountValue) || 0;
    
    let finalPrice = price;
    
    // Apply discount based on type
    if (discountValue > 0) {
      if (productData.discountType === 'Percentage') {
        finalPrice = price - (price * discountValue / 100);
      } else {
        finalPrice = price - discountValue;
      }
    }
    
    // Ensure final price is not negative
    finalPrice = Math.max(0, finalPrice);
    
    // Calculate minimum selling price (purchase price + 10% margin)
    const minSellingPrice = purchasePrice > 0 ? purchasePrice * 1.1 : 0;
    
    // Calculate profit margin percentage
    let profitMargin = 0;
    if (purchasePrice > 0 && finalPrice > 0) {
      profitMargin = ((finalPrice - purchasePrice) / purchasePrice) * 100;
    }
    
    return {
      minSellingPrice: Math.round(minSellingPrice * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100
    };
  }

  // Validate business rules for product pricing
  validateProfitRules(productData) {
    const purchasePrice = parseFloat(productData.purchasePrice) || 0;
    const price = parseFloat(productData.price) || 0;
    
    if (purchasePrice > 0 && price <= purchasePrice) {
      return {
        isValid: false,
        error: 'Selling price must be greater than purchase price'
      };
    }
    
    return { isValid: true };
  }
}
export const productService = new ProductService();