import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import authSlice from './authSlice'

// Base query with authentication
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
  tagTypes: ['User', 'Car', 'Reservation', 'Payment'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: 'auth/register',
        method: 'POST',
        body: userData,
      }),
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
  }),
})

export const {
  // Auth hooks
  useLoginMutation,
  useRegisterMutation,
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
} = api

export const store = configureStore({
  reducer: {
    auth: authSlice,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
}) 