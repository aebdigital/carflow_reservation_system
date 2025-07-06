import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import authSlice, { clearStateOnLogout } from './authSlice'

// Base query with authentication - Fixed API URL concatenation
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api',
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
  tagTypes: ['User', 'Car', 'Reservation', 'Payment', 'WebsiteSettings', 'DiscountCode', 'Banner'],
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
    cancelReservation: builder.mutation({
      query: ({ id, reason }) => ({
        url: `reservations/${id}/cancel`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reservation', id }, 'Reservation', 'Car'],
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
    getUserStats: builder.query({
      query: () => 'users/stats',
    }),
    searchUsers: builder.query({
      query: (params) => ({
        url: 'users/search',
        params,
      }),
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
    updateModal: builder.mutation({
      query: (modalData) => ({
        url: 'website/settings/modal',
        method: 'PUT',
        body: modalData,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),
    toggleModal: builder.mutation({
      query: () => ({
        url: 'website/settings/modal/toggle',
        method: 'PATCH',
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
  useDeleteCarImageMutation,
  useSetPrimaryCarImageMutation,
  
  // Reservation hooks
  useGetReservationsQuery,
  useGetReservationQuery,
  useCreateReservationMutation,
  useUpdateReservationMutation,
  useCancelReservationMutation,
  useCheckInReservationMutation,
  useCheckOutReservationMutation,
  useGetReservationStatsQuery,
  
  // User hooks
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useBlacklistUserMutation,
  useGetUserStatsQuery,
  useSearchUsersQuery,
  
  // Payment hooks
  useGetPaymentsQuery,
  useCreatePaymentIntentMutation,
  useConfirmPaymentMutation,
  useProcessRefundMutation,
  useGetPaymentStatsQuery,

  // Website Settings hooks
  useGetWebsiteSettingsQuery,
  useUpdateWebsiteSettingsMutation,
  useUpdateInfoBarMutation,
  useToggleInfoBarMutation,
  useUpdateModalMutation,
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
} = api

export const store = configureStore({
  reducer: {
    auth: authSlice,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
}) 