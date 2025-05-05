import React from 'react';

interface BookLoaderProps {
    size?: string;
    color?: string;
}

/** Loading Animation designed to look like dots spinning */
const Loader: React.FC<BookLoaderProps> = ({
    size = '80px',
    color = '#3498db'
}) => {
    return (
        <>
            <div style={{ 
                width: size, 
                height: size, 
                border: `8px solid ${color}`, 
                borderTop: `8px solid transparent`, 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
            }} />
            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </>
    );
};

export default Loader;