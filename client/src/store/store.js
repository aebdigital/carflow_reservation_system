import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import authSlice, { clearStateOnLogout } from './authSlice'

// Base query with authentication - Fixed API URL concatenation
const baseQuery = fetchBaseQuery({
  baseUrl: (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, ''),
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
})

// RTK Query API
export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Car', 'Reservation', 'Payment', 'WebsiteSettings', 'DiscountCode', 'Banner', 'Contract', 'Blog', 'PublicBlog', 'BlogCategory', 'BlogTag', 'Settings'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          
          // Clear all RTK Query cache before setting new user data
          // This prevents showing previous user's data when switching accounts
          dispatch(api.util.resetApiState())
          
          // Force invalidate all tags to ensure fresh data fetch
          dispatch(api.util.invalidateTags(['User', 'Car', 'Reservation', 'Payment']))
          
        } catch (error) {
          // Login failed, don't clear cache
          console.error('Login failed:', error)
        }
      },
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: 'auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          // Clear all RTK Query cache on successful logout
          dispatch(api.util.resetApiState())
          // Clear auth state
          dispatch(clearStateOnLogout())
        } catch (error) {
          // Even if logout fails on server, clear local state
          dispatch(api.util.resetApiState())
          dispatch(clearStateOnLogout())
        }
      },
    }),
    getMe: builder.query({
      query: () => 'auth/me',
      providesTags: ['User'],
    }),
    
    // Car endpoints
    getCars: builder.query({
      query: (params = {}) => ({
        url: 'cars',
        params,
      }),
      providesTags: ['Car'],
    }),
    getCar: builder.query({
      query: (id) => `cars/${id}`,
      providesTags: (result, error, id) => [{ type: 'Car', id }],
    }),
    createCar: builder.mutation({
      query: (carData) => {
        // Handle FormData for image uploads
        if (carData instanceof FormData) {
          return {
            url: 'cars',
            method: 'POST',
            body: carData,
            formData: true,
          }
        }
        
        return {
          url: 'cars',
          method: 'POST',
          body: carData,
        }
      },
      invalidatesTags: ['Car'],
    }),
    updateCar: builder.mutation({
      query: (carData) => {
        // Handle FormData for image uploads
        if (carData instanceof FormData) {
          const id = carData.get('id')
          carData.delete('id') // Remove id from FormData as it goes in URL
          
          return {
            url: `cars/${id}`,
            method: 'PUT',
            body: carData,
            formData: true,
          }
        }
        
        // Regular JSON update
        const { id, ...updateData } = carData
        return {
          url: `cars/${id}`,
          method: 'PUT',
          body: updateData,
        }
      },
      invalidatesTags: (result, error, carData) => {
        const id = carData instanceof FormData ? carData.get('id') : carData.id
        return [{ type: 'Car', id }, 'Car']
      },
    }),
    deleteCar: builder.mutation({
      query: (id) => ({
        url: `cars/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Car'],
    }),
    getCarStats: builder.query({
      query: () => 'cars/stats',
    }),
    getGlobalEquipment: builder.query({
      query: () => {
        // Get current user's email for tenant-specific equipment
        return 'auth/me'
      },
      transformResponse: async (result, meta, arg) => {
        // Get user email from the auth/me response
        const userEmail = result?.data?.email
        if (!userEmail) {
          throw new Error('User email not found')
        }
        
        // Make a second request to get the equipment for this user's tenant
        const equipmentResponse = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api'}/public/users/${userEmail}/features`
        )
        const equipmentData = await equipmentResponse.json()
        return equipmentData.data?.equipment || []
      },
      providesTags: ['Car'], // Invalidate when cars change
    }),
    
    // Car image management endpoints
    deleteCarImage: builder.mutation({
      query: ({ carId, imageIndex }) => ({
        url: `cars/${carId}/images/${imageIndex}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { carId }) => [{ type: 'Car', id: carId }, 'Car'],
    }),
    setPrimaryCarImage: builder.mutation({
      query: ({ carId, imageIndex }) => ({
        url: `cars/${carId}/images/${imageIndex}/primary`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, { carId }) => [{ type: 'Car', id: carId }, 'Car'],
    }),
    reorderCarImages: builder.mutation({
      query: ({ carId, imageIds }) => ({
        url: `cars/${carId}/images/reorder`,
        method: 'PUT',
        body: { imageIds },
      }),
      async onQueryStarted({ carId, imageIds }, { dispatch, queryFulfilled }) {
        console.log('🔄 [RTK] Starting optimistic update for car:', carId);
        console.log('🔄 [RTK] Image IDs order:', imageIds);
        
        // Optimistic update
        const patchResult = dispatch(
          api.util.updateQueryData('getCars', undefined, (draft) => {
            console.log('🔄 [RTK] Updating getCars cache...');
            const car = draft.find(c => c._id === carId);
            if (car && car.images) {
              console.log('🔄 [RTK] Found car in cache, original images:', car.images.map(img => ({ id: img._id, order: img.order })));
              
              // Reorder images based on imageIds array
              const reorderedImages = imageIds.map((id, index) => {
                const image = car.images.find(img => img._id === id);
                if (image) {
                  return {
                    ...image,
                    order: index,
                    isPrimary: index === 0 // First image is always primary
                  };
                }
                return null;
              }).filter(Boolean);
              
              // Add any images that weren't in the reorder list at the end
              const unorderedImages = car.images.filter(img => !imageIds.includes(img._id));
              car.images = [...reorderedImages, ...unorderedImages];
              
              console.log('🔄 [RTK] Updated getCars cache, new images:', car.images.map(img => ({ id: img._id, order: img.order })));
            } else {
              console.log('🔄 [RTK] Car not found in getCars cache or no images');
            }
          })
        );

        // Also update specific car cache
        const patchCarResult = dispatch(
          api.util.updateQueryData('getCar', carId, (draft) => {
            console.log('🔄 [RTK] Updating getCar cache for carId:', carId);
            console.log('🔄 [RTK] Draft structure:', draft ? Object.keys(draft) : 'no draft');
            
            // Handle both direct car object and {success, data} wrapper format
            const carObj = draft?.data ? draft.data : draft;
            
            if (carObj && carObj.images) {
              console.log('🔄 [RTK] Found car in getCar cache, original images:', carObj.images.map(img => ({ id: img._id, order: img.order })));
              
              // Reorder images based on imageIds array
              const reorderedImages = imageIds.map((id, index) => {
                const image = carObj.images.find(img => img._id === id);
                if (image) {
                  return {
                    ...image,
                    order: index,
                    isPrimary: index === 0 // First image is always primary
                  };
                }
                return null;
              }).filter(Boolean);
              
              // Add any images that weren't in the reorder list at the end
              const unorderedImages = carObj.images.filter(img => !imageIds.includes(img._id));
              carObj.images = [...reorderedImages, ...unorderedImages];
              
              console.log('🔄 [RTK] Updated getCar cache, new images:', carObj.images.map(img => ({ id: img._id, order: img.order })));
            } else {
              console.log('🔄 [RTK] Car not found in getCar cache or no images');
              console.log('🔄 [RTK] carObj:', carObj);
            }
          })
        );

        try {
          console.log('🔄 [RTK] Waiting for backend mutation...');
          await queryFulfilled;
          console.log('✅ [RTK] Backend mutation succeeded');
        } catch (error) {
          console.log('❌ [RTK] Backend mutation failed:', error);
          // Revert optimistic update on error
          patchResult.undo();
          patchCarResult.undo();
          console.log('🔄 [RTK] Optimistic updates reverted');
        }
      },
    }),
    
    // Reservation endpoints
    getReservations: builder.query({
      query: (params = {}) => ({
        url: 'reservations',
        params,
      }),
      providesTags: ['Reservation'],
    }),
    getReservation: builder.query({
      query: (id) => `reservations/${id}`,
      providesTags: (result, error, id) => [{ type: 'Reservation', id }],
    }),
    createReservation: builder.mutation({
      query: (reservationData) => ({
        url: 'reservations',
        method: 'POST',
        body: reservationData,
      }),
      invalidatesTags: ['Reservation', 'Car'],
    }),
    updateReservation: builder.mutation({
      query: ({ id, ...reservationData }) => ({
        url: `reservations/${id}`,
        method: 'PUT',
        body: reservationData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation'],
    }),
    confirmReservation: builder.mutation({
      query: ({ id, notes }) => ({
        url: `reservations/${id}/confirm`,
        method: 'PUT',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation', 'Car'],
    }),
    confirmReservationPayment: builder.mutation({
      query: ({ id, notes }) => ({
        url: `reservations/${id}/confirm-payment`,
        method: 'PUT',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation'],
    }),
    sendPaymentNotification: builder.mutation({
      query: ({ id }) => ({
        url: `reservations/${id}/send-payment-notification`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation'],
    }),
    cancelReservation: builder.mutation({
      query: ({ id, reason }) => ({
        url: `reservations/${id}/cancel`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation', 'Car'],
    }),
    deleteReservation: builder.mutation({
      query: (id) => ({
        url: `reservations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reservation', 'Car'],
    }),
    checkInReservation: builder.mutation({
      query: ({ id, ...checkInData }) => ({
        url: `reservations/${id}/checkin`,
        method: 'PUT',
        body: checkInData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation'],
    }),
    checkOutReservation: builder.mutation({
      query: ({ id, ...checkOutData }) => ({
        url: `reservations/${id}/checkout`,
        method: 'PUT',
        body: checkOutData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation', 'Car'],
    }),
    getReservationStats: builder.query({
      query: (params = {}) => ({
        url: 'reservations/stats',
        params,
      }),
    }),
    
    // User endpoints
    getUsers: builder.query({
      query: (params = {}) => ({
        url: 'users',
        params,
      }),
      providesTags: ['User'],
    }),
    getUser: builder.query({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation({
      query: (userData) => ({
        url: 'users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: `users/${id}`,
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'User'],
    }),
    blacklistUser: builder.mutation({
      query: ({ id, reason }) => ({
        url: `users/${id}/blacklist`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'User'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    getUserStats: builder.query({
      query: () => 'users/stats',
    }),
    searchUsers: builder.query({
      query: (params) => ({
        url: 'users/search',
        params,
      }),
    }),
    toggleUserEmailOptOut: builder.mutation({
      query: ({ id, optOut, reason }) => ({
        url: `users/${id}/email-opt-out`,
        method: 'PUT',
        body: { optOut, reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'User'],
    }),
    
    // Payment endpoints
    getPayments: builder.query({
      query: (params = {}) => ({
        url: 'payments',
        params,
      }),
      providesTags: ['Payment'],
    }),
    createPaymentIntent: builder.mutation({
      query: (paymentData) => ({
        url: 'payments/create-payment-intent',
        method: 'POST',
        body: paymentData,
      }),
    }),
    confirmPayment: builder.mutation({
      query: (confirmData) => ({
        url: 'payments/confirm',
        method: 'POST',
        body: confirmData,
      }),
      invalidatesTags: ['Payment', 'Reservation'],
    }),
    updatePaymentStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `payments/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payment', id }, 'Payment', 'Reservation'],
    }),
    processRefund: builder.mutation({
      query: ({ id, ...refundData }) => ({
        url: `payments/${id}/refund`,
        method: 'POST',
        body: refundData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payment', id }, 'Payment'],
    }),
    getPaymentStats: builder.query({
      query: (params = {}) => ({
        url: 'payments/stats',
        params,
      }),
    }),

    // Website Settings endpoints
    getWebsiteSettings: builder.query({
      query: () => 'website/settings',
      providesTags: ['WebsiteSettings'],
    }),
    updateWebsiteSettings: builder.mutation({
      query: (settingsData) => ({
        url: 'website/settings',
        method: 'PUT',
        body: settingsData,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),
    updateInfoBar: builder.mutation({
      query: (infoBarData) => ({
        url: 'website/settings/info-bar',
        method: 'PUT',
        body: infoBarData,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),
    toggleInfoBar: builder.mutation({
      query: () => ({
        url: 'website/settings/info-bar/toggle',
        method: 'PATCH',
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),

    // Modal CRUD endpoints
    getModals: builder.query({
      query: () => 'website/modals',
      providesTags: ['WebsiteSettings'],
    }),
    createModal: builder.mutation({
      query: (modalData) => ({
        url: 'website/modals',
        method: 'POST',
        body: modalData,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),
    updateModal: builder.mutation({
      query: ({ id, data }) => ({
        url: `website/modals/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),
    deleteModal: builder.mutation({
      query: (id) => ({
        url: `website/modals/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),
    toggleModal: builder.mutation({
      query: ({ id, isActive }) => ({
        url: `website/modals/${id}/toggle`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),

    // Discount Codes endpoints
    getDiscountCodes: builder.query({
      query: (params = {}) => ({
        url: 'discount-codes',
        params,
      }),
      providesTags: ['DiscountCode'],
    }),
    getDiscountCode: builder.query({
      query: (id) => `discount-codes/${id}`,
      providesTags: (result, error, id) => [{ type: 'DiscountCode', id }],
    }),
    createDiscountCode: builder.mutation({
      query: (discountCodeData) => ({
        url: 'discount-codes',
        method: 'POST',
        body: discountCodeData,
      }),
      invalidatesTags: ['DiscountCode'],
    }),
    updateDiscountCode: builder.mutation({
      query: ({ id, ...discountCodeData }) => ({
        url: `discount-codes/${id}`,
        method: 'PUT',
        body: discountCodeData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'DiscountCode', id }, 'DiscountCode'],
    }),
    deleteDiscountCode: builder.mutation({
      query: (id) => ({
        url: `discount-codes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DiscountCode'],
    }),
    toggleDiscountCode: builder.mutation({
      query: (id) => ({
        url: `discount-codes/${id}/toggle`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'DiscountCode', id }, 'DiscountCode'],
    }),
    validateDiscountCode: builder.mutation({
      query: (validationData) => ({
        url: 'discount-codes/validate',
        method: 'POST',
        body: validationData,
      }),
    }),
    getDiscountCodeStats: builder.query({
      query: () => 'discount-codes/stats',
    }),

    // Banner endpoints
    getBanners: builder.query({
      query: (params = {}) => ({
        url: 'banners',
        params,
      }),
      providesTags: ['Banner'],
    }),
    getBanner: builder.query({
      query: (id) => `banners/${id}`,
      providesTags: (result, error, id) => [{ type: 'Banner', id }],
    }),
    createBanner: builder.mutation({
      query: (bannerData) => ({
        url: 'banners',
        method: 'POST',
        body: bannerData,
      }),
      invalidatesTags: ['Banner'],
    }),
    updateBanner: builder.mutation({
      query: ({ id, data }) => ({
        url: `banners/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Banner', id }, 'Banner'],
    }),
    deleteBanner: builder.mutation({
      query: (id) => ({
        url: `banners/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Banner'],
    }),
    getBannersByPage: builder.query({
      query: (page) => `banners/page/${page}`,
      providesTags: ['Banner'],
    }),
    getCarouselBanners: builder.query({
      query: (page) => `banners/carousel/${page}`,
      providesTags: ['Banner'],
    }),
    updateBannerSortOrder: builder.mutation({
      query: (sortData) => ({
        url: 'banners/sort-order',
        method: 'PUT',
        body: sortData,
      }),
      invalidatesTags: ['Banner'],
    }),

    // Banner Image Management endpoints
    addBannerImages: builder.mutation({
      query: ({ bannerId, formData }) => ({
        url: `banners/${bannerId}/images`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (result, error, { bannerId }) => [{ type: 'Banner', id: bannerId }, 'Banner'],
    }),
    removeBannerImage: builder.mutation({
      query: ({ bannerId, imageId }) => ({
        url: `banners/${bannerId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { bannerId }) => [{ type: 'Banner', id: bannerId }, 'Banner'],
    }),
    reorderBannerImages: builder.mutation({
      query: ({ bannerId, imageIds }) => ({
        url: `banners/${bannerId}/images/reorder`,
        method: 'PUT',
        body: { imageIds },
      }),
      invalidatesTags: (result, error, { bannerId }) => [{ type: 'Banner', id: bannerId }, 'Banner'],
    }),
    updateBannerImage: builder.mutation({
      query: ({ bannerId, imageId, imageData }) => ({
        url: `banners/${bannerId}/images/${imageId}`,
        method: 'PUT',
        body: imageData,
      }),
      invalidatesTags: (result, error, { bannerId }) => [{ type: 'Banner', id: bannerId }, 'Banner'],
    }),

    // Public Banner endpoints (for website frontend)
    getBannersByPosition: builder.query({
      query: ({ position, tenantId }) => ({
        url: `banners/position/${position}`,
        headers: tenantId ? { 'x-tenant-id': tenantId } : {},
      }),
      providesTags: ['Banner'],
    }),
    getActiveBanners: builder.query({
      query: ({ tenantId }) => ({
        url: 'banners/active',
        headers: tenantId ? { 'x-tenant-id': tenantId } : {},
      }),
      providesTags: ['Banner'],
    }),
    getPublicBanners: builder.query({
      query: ({ tenantId, position }) => ({
        url: 'public/banners',
        params: { tenantId, position },
      }),
      providesTags: ['Banner'],
    }),
    getPublicBannersByUser: builder.query({
      query: ({ userEmail, position }) => ({
        url: `public/users/${userEmail}/banners`,
        params: { position },
      }),
      providesTags: ['Banner'],
    }),

    // Contract endpoints
    getContracts: builder.query({
      query: (params = {}) => ({
        url: 'contracts',
        params,
      }),
      providesTags: ['Contract'],
    }),
    getContract: builder.query({
      query: (id) => `contracts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Contract', id }],
    }),
    createContract: builder.mutation({
      query: (contractData) => ({
        url: 'contracts',
        method: 'POST',
        body: contractData,
      }),
      invalidatesTags: ['Contract', 'Reservation'],
    }),
    updateContract: builder.mutation({
      query: ({ id, ...contractData }) => ({
        url: `contracts/${id}`,
        method: 'PUT',
        body: contractData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Contract', id }, 'Contract'],
    }),
    deleteContract: builder.mutation({
      query: (id) => ({
        url: `contracts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contract'],
    }),
    updateContractStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `contracts/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Contract', id }, 'Contract'],
    }),
    signContractStaff: builder.mutation({
      query: (id) => ({
        url: `contracts/${id}/sign-staff`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Contract', id }, 'Contract'],
    }),
    generateContractPDF: builder.mutation({
      query: ({ id, preview = false }) => ({
        url: `contracts/${id}/pdf${preview ? '?preview=true' : ''}`,
        method: 'GET',
        responseHandler: async (response) => {
          // Handle PDF response
          const blob = await response.blob();
          
          if (preview) {
            // For preview, open in new tab
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
          } else {
            // For download, trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zmluva-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }
          return { success: true };
        },
      }),
    }),
    getContractStats: builder.query({
      query: () => 'contracts/stats',
    }),

    // Slovak rental agreement PDF generation
    generateReservationSlovakAgreement: builder.mutation({
      query: ({ id, preview = false }) => ({
        url: `reservations/${id}/slovak-agreement${preview ? '?preview=true' : ''}`,
        method: 'GET',
        responseHandler: (response) => {
          // Handle PDF response
          if (preview) {
            // For preview, open in new tab
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
          } else {
            // For download, trigger download
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zmluva-o-najme-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }
          return { success: true };
        },
      }),
    }),
    getSlovakAgreementTemplateFields: builder.query({
      query: () => 'reservations/pdf-fields',
    }),

    // Blog endpoints
    getBlogs: builder.query({
      query: (params = {}) => ({
        url: 'blogs',
        params,
      }),
      providesTags: ['Blog'],
    }),
    getBlog: builder.query({
      query: (id) => `blogs/${id}`,
      providesTags: (result, error, id) => [{ type: 'Blog', id }],
    }),
    createBlog: builder.mutation({
      query: (blogData) => ({
        url: 'blogs',
        method: 'POST',
        body: blogData,
      }),
      invalidatesTags: ['Blog'],
    }),
    updateBlog: builder.mutation({
      query: ({ id, ...blogData }) => ({
        url: `blogs/${id}`,
        method: 'PUT',
        body: blogData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Blog', id }, 'Blog'],
    }),
    deleteBlog: builder.mutation({
      query: (id) => ({
        url: `blogs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Blog'],
    }),
    toggleBlogStatus: builder.mutation({
      query: ({ id, status, publishDate }) => ({
        url: `blogs/${id}/publish`,
        method: 'PATCH',
        body: { status, publishDate },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Blog', id }, 'Blog'],
    }),
    uploadBlogImage: builder.mutation({
      query: ({ id, formData }) => ({
        url: `blogs/${id}/upload-image`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Blog', id }],
    }),
    
    // Public Blog endpoints
    getPublicBlogs: builder.query({
      query: ({ userEmail, ...params }) => ({
        url: `public/users/${userEmail}/blogs`,
        params,
      }),
      providesTags: ['PublicBlog'],
    }),
    getPublicBlogBySlug: builder.query({
      query: ({ userEmail, slug }) => `public/users/${userEmail}/blogs/${slug}`,
      providesTags: (result, error, { slug }) => [{ type: 'PublicBlog', id: slug }],
    }),
    getBlogCategories: builder.query({
      query: (userEmail) => `public/users/${userEmail}/blog-categories`,
      providesTags: ['BlogCategory'],
    }),
    getBlogTags: builder.query({
      query: (userEmail) => `public/users/${userEmail}/blog-tags`,
      providesTags: ['BlogTag'],
    }),
    likeBlog: builder.mutation({
      query: ({ userEmail, slug }) => ({
        url: `public/users/${userEmail}/blogs/${slug}/like`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { slug }) => [{ type: 'PublicBlog', id: slug }],
    }),
    addBlogComment: builder.mutation({
      query: ({ userEmail, slug, commentData }) => ({
        url: `public/users/${userEmail}/blogs/${slug}/comments`,
        method: 'POST',
        body: commentData,
      }),
    }),

    // Public Pickup Locations endpoint
    getPickupLocationsByUser: builder.query({
      query: (userEmail) => `public/users/${userEmail}/pickup-locations`,
      providesTags: ['PickupLocations'],
    }),

    // Campaign endpoints
    sendMassEmail: builder.mutation({
      query: (campaignData) => ({
        url: 'campaigns/send',
        method: 'POST',
        body: campaignData,
      }),
    }),
    getCampaignStats: builder.query({
      query: () => 'campaigns/stats',
    }),

    // Email subscription endpoints  
    getEmailSubscriptions: builder.query({
      query: (params) => ({
        url: 'email-subscriptions',
        params,
      }),
    }),
    getEmailSubscriptionStats: builder.query({
      query: () => 'email-subscriptions/stats',
    }),

    // Settings endpoints
    getSettings: builder.query({
      query: () => 'settings',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation({
      query: (settingsData) => ({
        url: 'settings',
        method: 'PUT',
        body: settingsData,
      }),
      invalidatesTags: ['Settings'],
    }),
    addPickupLocation: builder.mutation({
      query: (locationData) => ({
        url: 'settings/pickup-locations',
        method: 'POST',
        body: locationData,
      }),
      invalidatesTags: ['Settings'],
    }),
    updatePickupLocation: builder.mutation({
      query: ({ locationId, ...locationData }) => ({
        url: `settings/pickup-locations/${locationId}`,
        method: 'PUT',
        body: locationData,
      }),
      invalidatesTags: ['Settings'],
    }),
    deletePickupLocation: builder.mutation({
      query: (locationId) => ({
        url: `settings/pickup-locations/${locationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),
    sendSupportContact: builder.mutation({
      query: (contactData) => ({
        url: 'settings/contact-support',
        method: 'POST',
        body: contactData,
      }),
    }),
  }),
})

export const {
  // Auth hooks
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  
  // Car hooks
  useGetCarsQuery,
  useGetCarQuery,
  useCreateCarMutation,
  useUpdateCarMutation,
  useDeleteCarMutation,
  useGetCarStatsQuery,
  useGetGlobalEquipmentQuery,
  useDeleteCarImageMutation,
  useSetPrimaryCarImageMutation,
  useReorderCarImagesMutation,
  
  // Reservation hooks
  useGetReservationsQuery,
  useGetReservationQuery,
  useCreateReservationMutation,
  useUpdateReservationMutation,
  useConfirmReservationMutation,
  useConfirmReservationPaymentMutation,
  useSendPaymentNotificationMutation,
  useCancelReservationMutation,
  useDeleteReservationMutation,
  useCheckInReservationMutation,
  useCheckOutReservationMutation,
  useGetReservationStatsQuery,
  
  // User hooks
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useBlacklistUserMutation,
  useDeleteUserMutation,
  useGetUserStatsQuery,
  useSearchUsersQuery,
  
  // Payment hooks
  useGetPaymentsQuery,
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
  useUpdatePaymentStatusMutation,
  useProcessRefundMutation,
  useGetPaymentStatsQuery,

  // Website Settings hooks
  useGetWebsiteSettingsQuery,
  useUpdateWebsiteSettingsMutation,
  useUpdateInfoBarMutation,
  useToggleInfoBarMutation,

  // Modal CRUD hooks
  useGetModalsQuery,
  useCreateModalMutation,
  useUpdateModalMutation,
  useDeleteModalMutation,
  useToggleModalMutation,

  // Discount Codes hooks
  useGetDiscountCodesQuery,
  useGetDiscountCodeQuery,
  useCreateDiscountCodeMutation,
  useUpdateDiscountCodeMutation,
  useDeleteDiscountCodeMutation,
  useToggleDiscountCodeMutation,
  useValidateDiscountCodeMutation,
  useGetDiscountCodeStatsQuery,

  // Banner hooks
  useGetBannersQuery,
  useGetBannerQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useGetBannersByPageQuery,
  useGetCarouselBannersQuery,
  useUpdateBannerSortOrderMutation,
  useAddBannerImagesMutation,
  useRemoveBannerImageMutation,
  useReorderBannerImagesMutation,
  useUpdateBannerImageMutation,
  useGetBannersByPositionQuery,
  useGetActiveBannersQuery,
  useGetPublicBannersQuery,
  useGetPublicBannersByUserQuery,

  // Contract hooks
  useGetContractsQuery,
  useGetContractQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
  useUpdateContractStatusMutation,
  useSignContractStaffMutation,
  useGenerateContractPDFMutation,
  useGetContractStatsQuery,
  useGenerateReservationSlovakAgreementMutation,
  useGetSlovakAgreementTemplateFieldsQuery,

  // Blog hooks
  useGetBlogsQuery,
  useGetBlogQuery,
  useCreateBlogMutation,
  useUpdateBlogMutation,
  useDeleteBlogMutation,
  useToggleBlogStatusMutation,
  useUploadBlogImageMutation,

  // Public Blog hooks
  useGetPublicBlogsQuery,
  useGetPublicBlogBySlugQuery,
  useGetBlogCategoriesQuery,
  useGetBlogTagsQuery,
  useLikeBlogMutation,
  useAddBlogCommentMutation,

  // Public Pickup Locations hooks
  useGetPickupLocationsByUserQuery,

  // Campaign hooks
  useSendMassEmailMutation,
  useGetCampaignStatsQuery,

  // Email subscription hooks
  useGetEmailSubscriptionsQuery,
  useGetEmailSubscriptionStatsQuery,

  // Settings hooks
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useAddPickupLocationMutation,
  useUpdatePickupLocationMutation,
  useDeletePickupLocationMutation,
  useSendSupportContactMutation,
  
  // User management hooks
  useToggleUserEmailOptOutMutation,
} = api

export const store = configureStore({
  reducer: {
    auth: authSlice,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
}) 