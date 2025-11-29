/**
 * Secure API Wrapper for Supabase
 * 
 * This module provides secure wrappers for common Supabase operations
 * with built-in validation, sanitization, and error handling
 */

import { supabase } from './supabase';
import { Security, rateLimiter } from './security';
import { ErrorHandler } from './error-handler';

// ============================================================================
// SECURE QUERY BUILDER
// ============================================================================

/**
 * Secure wrapper for Supabase select queries
 */
export async function secureSelect<T = any>(
  table: string,
  options: {
    columns?: string;
    filters?: { column: string; value: any; operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' }[];
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
    userId?: string; // For rate limiting
  } = {}
): Promise<{ data: T[] | null; error: any }> {
  const { columns = '*', filters = [], limit, orderBy, userId } = options;

  try {
    // Rate limiting
    if (userId && !rateLimiter.isAllowed(`select_${userId}_${table}`, 100, 60000)) {
      return {
        data: null,
        error: ErrorHandler.createError('permission', 'Too many requests. Please try again later.'),
      };
    }

    // Build query
    let query = supabase.from(table).select(columns);

    // Apply filters with validation
    for (const filter of filters) {
      const validation = Security.validateDatabaseInput(String(filter.value));
      if (!validation.isValid) {
        return {
          data: null,
          error: ErrorHandler.createError('validation', validation.error || 'Invalid filter'),
        };
      }

      const operator = filter.operator || 'eq';
      switch (operator) {
        case 'eq':
          query = query.eq(filter.column, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.column, filter.value);
          break;
        case 'gt':
          query = query.gt(filter.column, filter.value);
          break;
        case 'lt':
          query = query.lt(filter.column, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.column, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.column, filter.value);
          break;
      }
    }

    // Apply limit
    if (limit) {
      query = query.limit(Math.min(limit, 1000)); // Max 1000 rows
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: ErrorHandler.handleError(error, 'secureSelect') };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: ErrorHandler.handleError(error, 'secureSelect') };
  }
}

/**
 * Secure wrapper for Supabase insert operations
 */
export async function secureInsert<T = any>(
  table: string,
  data: any,
  options: {
    userId?: string;
    validateOwnership?: boolean;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { userId, validateOwnership = true } = options;

  try {
    // Rate limiting
    if (userId && !rateLimiter.isAllowed(`insert_${userId}_${table}`, 20, 60000)) {
      return {
        data: null,
        error: ErrorHandler.createError('permission', 'Too many requests. Please try again later.'),
      };
    }

    // Sanitize text fields
    const sanitizedData = { ...data };
    Object.keys(sanitizedData).forEach((key) => {
      if (typeof sanitizedData[key] === 'string') {
        const validation = Security.validateText(sanitizedData[key], { maxLength: 10000 });
        sanitizedData[key] = validation.sanitized;
      }
    });

    // Check ownership if required
    if (validateOwnership && userId && data.user_id && data.user_id !== userId) {
      return {
        data: null,
        error: ErrorHandler.createError('permission', 'Permission denied'),
      };
    }

    const { data: result, error } = await supabase
      .from(table)
      .insert(sanitizedData)
      .select()
      .maybeSingle();

    if (error) {
      return { data: null, error: ErrorHandler.handleError(error, 'secureInsert') };
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: ErrorHandler.handleError(error, 'secureInsert') };
  }
}

/**
 * Secure wrapper for Supabase update operations
 */
export async function secureUpdate<T = any>(
  table: string,
  id: string,
  updates: any,
  options: {
    userId?: string;
    ownerColumn?: string; // Column to check ownership (e.g., 'user_id', 'sender_id')
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { userId, ownerColumn = 'user_id' } = options;

  try {
    // Rate limiting
    if (userId && !rateLimiter.isAllowed(`update_${userId}_${table}`, 30, 60000)) {
      return {
        data: null,
        error: ErrorHandler.createError('permission', 'Too many requests. Please try again later.'),
      };
    }

    // Verify ownership
    if (userId && ownerColumn) {
      const { data: existing } = await supabase
        .from(table)
        .select(ownerColumn)
        .eq('id', id)
        .maybeSingle();

      if (!existing || existing[ownerColumn] !== userId) {
        return {
          data: null,
          error: ErrorHandler.createError('permission', 'Permission denied'),
        };
      }
    }

    // Sanitize text fields
    const sanitizedUpdates = { ...updates };
    Object.keys(sanitizedUpdates).forEach((key) => {
      if (typeof sanitizedUpdates[key] === 'string') {
        const validation = Security.validateText(sanitizedUpdates[key], { maxLength: 10000 });
        sanitizedUpdates[key] = validation.sanitized;
      }
    });

    const { data, error } = await supabase
      .from(table)
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return { data: null, error: ErrorHandler.handleError(error, 'secureUpdate') };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: ErrorHandler.handleError(error, 'secureUpdate') };
  }
}

/**
 * Secure wrapper for Supabase delete operations
 */
export async function secureDelete(
  table: string,
  id: string,
  options: {
    userId?: string;
    ownerColumn?: string;
  } = {}
): Promise<{ error: any }> {
  const { userId, ownerColumn = 'user_id' } = options;

  try {
    // Rate limiting
    if (userId && !rateLimiter.isAllowed(`delete_${userId}_${table}`, 10, 60000)) {
      return {
        error: ErrorHandler.createError('permission', 'Too many requests. Please try again later.'),
      };
    }

    // Verify ownership
    if (userId && ownerColumn) {
      const { data: existing } = await supabase
        .from(table)
        .select(ownerColumn)
        .eq('id', id)
        .maybeSingle();

      if (!existing || existing[ownerColumn] !== userId) {
        return {
          error: ErrorHandler.createError('permission', 'Permission denied'),
        };
      }
    }

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      return { error: ErrorHandler.handleError(error, 'secureDelete') };
    }

    return { error: null };
  } catch (error) {
    return { error: ErrorHandler.handleError(error, 'secureDelete') };
  }
}

// ============================================================================
// SECURE FILE UPLOAD
// ============================================================================

/**
 * Secure file upload with validation
 */
export async function secureUpload(
  bucket: string,
  file: {
    uri: string;
    fileName: string;
    mimeType?: string;
    size?: number | null;
  },
  options: {
    userId: string;
    maxSize?: number;
    allowedTypes?: string[];
  }
): Promise<{ url: string | null; error: any }> {
  const { userId, maxSize = 50 * 1024 * 1024, allowedTypes } = options;

  try {
    // Rate limiting for uploads
    if (!rateLimiter.isAllowed(`upload_${userId}`, 10, 60000)) {
      return {
        url: null,
        error: ErrorHandler.createError('permission', 'Too many uploads. Please try again later.'),
      };
    }

    // Validate file
    const fileValidation = Security.validateFile(file, { maxSize, allowedTypes });
    if (!fileValidation.isValid) {
      return {
        url: null,
        error: ErrorHandler.createError('validation', fileValidation.error || 'Invalid file'),
      };
    }

    // Sanitize file name
    const sanitizedFileName = Security.sanitizeFileName(file.fileName);
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}-${sanitizedFileName}`;

    // Fetch file data
    const response = await fetch(file.uri);
    const arrayBuffer = await response.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBytes, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        url: null,
        error: ErrorHandler.handleError(uploadError, 'secureUpload'),
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        url: null,
        error: ErrorHandler.createError('storage', 'Failed to get file URL'),
      };
    }

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: ErrorHandler.handleError(error, 'secureUpload') };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SecureAPI = {
  select: secureSelect,
  insert: secureInsert,
  update: secureUpdate,
  delete: secureDelete,
  upload: secureUpload,
};

