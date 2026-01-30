import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = "",
    width,
    height,
    circle = false
}) => {
    const style: React.CSSProperties = {
        width: width,
        height: height,
        borderRadius: circle ? '50%' : undefined
    };

    return (
        <div
            className={`animate-pulse bg-slate-200 ${className} ${circle ? '' : 'rounded-md'}`}
            style={style}
        />
    );
};

export default Skeleton;
