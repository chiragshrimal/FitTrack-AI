import axios from '../api/axios.jsx';
import useAuth from './useAuth';

const useRefreshToken = () => {
    const { auth, setAuth } = useAuth();

    // console.log("User Type:", auth?.user?.userType);

    const REFRESH_TOKEN_URL = (auth?.user?.userType === "trainer")
        ? "/api/trainer/refresh-token"
        : "/api/trainee/refresh-token";

    // console.log("Refresh token URL:", REFRESH_TOKEN_URL);
    

    const refresh = async () => {
        try {
            const response = await axios.post(
                REFRESH_TOKEN_URL,
                { },
                {withCredentials: true} // This ensures cookies are sent with the request
            );
            console.log("Refresh token response:", response);

            // console.log("New access token:",response.data.accessToken);
            // console.log("New refresh token:",response.data.accessToken);
            
            setAuth(prev => ({                
                ...prev,
                accessToken: response?.data?.accessToken,
                refreshToken: response?.data?.refreshToken
            }));
            return response?.data?.accessToken;
        } catch (err) { 
            console.error("Token refresh failed:", err);
            setAuth(null);
            return null;
        }
    }

    return refresh;
};

export default useRefreshToken;