// Type override for react-icons to fix React 19 JSX compatibility
import type { SVGProps, JSX } from 'react';

declare module 'react-icons/lib' {
    export interface IconBaseProps extends SVGProps<SVGSVGElement> {
        size?: string | number;
        color?: string;
        title?: string;
    }
    export type IconType = (props: IconBaseProps) => JSX.Element;
}

declare module 'react-icons/fi' {
    import { IconBaseProps, IconType } from 'react-icons/lib';
    export const FiMessageCircle: IconType;
    export const FiSend: IconType;
    export const FiDownload: IconType;
    export const FiCopy: IconType;
    export const FiMic: IconType;
    export const FiMicOff: IconType;
    export const FiVolume2: IconType;
    export const FiVolumeX: IconType;
    export const FiHome: IconType;
    export const FiFileText: IconType;
    export const FiShield: IconType;
    export const FiFolder: IconType;
    export const FiX: IconType;
    export const FiChevronDown: IconType;
    export const FiChevronUp: IconType;
    export const FiCheck: IconType;
    export const FiAlertCircle: IconType;
    export const FiInfo: IconType;
    export const FiSearch: IconType;
    export const FiUser: IconType;
    export const FiSettings: IconType;
    export const FiLogOut: IconType;
    export const FiMenu: IconType;
    export const FiBriefcase: IconType;
    export const FiTrash2: IconType;
    export const FiEdit: IconType;
    export const FiEye: IconType;
    export const FiPlus: IconType;
    export const FiRefreshCw: IconType;
}
