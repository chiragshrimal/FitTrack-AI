import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useRefreshToken from '../hooks/useRefreshToken';
import useAuth from '../hooks/useAuth';

const PersistLogin = () => {
    const [isLoading, setIsLoading] = useState(true);
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        let isMounted = true;

        const verifyRefreshToken = async () => {
            try {
                await refresh();
            }
            catch (err) {
                console.error(err);
            }
            finally {
                isMounted && setIsLoading(false);
            }
        };

        if(!auth?.accessToken) {
            verifyRefreshToken() 
        }
        else {
            setIsLoading(false);
        }

        return () => {isMounted = false};
    }, []);


    return(
        <> 
            {isLoading ? console.log("Loading...") : <Outlet />}
        </>
    )
};

export default PersistLogin