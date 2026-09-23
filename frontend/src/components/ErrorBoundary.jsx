// import React from 'react';

// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error, errorInfo) {
//     console.error("Caught error in React ErrorBoundary:", error, errorInfo);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div className="min-h-screen flex items-center justify-center p-6 bg-[#0c0a16] text-white">
//           <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
//             <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
//             <p className="text-sm text-slate-300">
//               An unexpected error occurred while rendering the application.
//             </p>
//             <pre className="text-xs bg-black/50 p-3 rounded text-left overflow-auto text-red-300">
//               {this.state.error?.message || String(this.state.error)}
//             </pre>
//             <button
//               onClick={() => {
//                 sessionStorage.clear();
//                 localStorage.clear();
//                 window.location.href = '/login';
//               }}
//               className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all"
//             >
//               Clear Storage & Return to Login
//             </button>
//           </div>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// export default ErrorBoundary;
