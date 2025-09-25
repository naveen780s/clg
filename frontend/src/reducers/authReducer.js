// Auth reducer for managing authentication state
export const initialState = {
  user: null,
  token: null,
  loading: true,
  error: null,
};

export const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'AUTH_LOADING_COMPLETE':
      return {
        ...state,
        loading: false,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };

    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload,
        },
      };

    case 'TOKEN_REFRESHED':
      return {
        ...state,
        token: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};