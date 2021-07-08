// 该应用程序已注册，但尚未加载
export const NOT_LOADED = 'NOT_LOADED';
// 正在获取应用的源代码
export const LOADING_SOURCE_CODE = 'LOADING_SOURCE_CODE';
// 应用已加载但未初始化
export const NOT_BOOTSTRAPPED = 'NOT_BOOTSTRAPPED';
// 应用正在初始化中
export const BOOTSTRAPPING = 'BOOTSTRAPPING';
// 应用已经初始化，但未挂载
export const NOT_MOUNTED = 'NOT_MOUNTED';
// 应用挂载中
export const MOUNTING = 'MOUNTING';
// 应用挂载完成
export const MOUNTED = 'MOUNTED';
// 应用正在更新数据
export const UPDATING = 'UPDATING';
// 应用正在卸载中
export const UNMOUNTING = 'UNMOUNTING';
// 应用正在移除中
export const UNLOADING = 'UNLOADING';
// 应用程序的加载功能返回了被拒绝的承诺
export const LOAD_ERROR = 'LOAD_ERROR';
// 应用程序的初始化功能返回了被拒绝的承诺
export const BOOTSTRAPP_ERROR = 'BOOTSTRAPP_ERROR';
// 应用程序的挂载功能返回了被拒绝的承诺
export const MOUNT_ERROR = 'MOUNT_ERROR';
// 应用程序的更新功能返回了被拒绝的承诺
export const UPDAT_ERROR = 'UPDAT_ERROR';
// 应用程序的卸载功能返回了被拒绝的承诺
export const UNMOUNT_ERROR = 'UNMOUNT_ERROR';
// 应用程序的移除功能返回了被拒绝的承诺
export const UNLOAD_ERROR = 'UNLOAD_ERROR';
// 应用在加载，引导，安装或卸载期间抛出错误，并且由于行为不当而被跳过，因此已被隔离。其他应用将继续正常运行
export const SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
