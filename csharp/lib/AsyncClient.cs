/**
 * Copyright GLIDE-for-Redis Project Contributors - SPDX Identifier: Apache-2.0
 */

using System.Buffers;
using System.Runtime.InteropServices;

namespace Glide;

public class AsyncClient : IDisposable
{
    #region public methods
    public AsyncClient(string host, UInt32 port, bool useTLS)
    {
        successCallbackDelegate = SuccessCallback;
        var successCallbackPointer = Marshal.GetFunctionPointerForDelegate(successCallbackDelegate);
        failureCallbackDelegate = FailureCallback;
        var failureCallbackPointer = Marshal.GetFunctionPointerForDelegate(failureCallbackDelegate);
        clientPointer = CreateClientFfi(host, port, useTLS, successCallbackPointer, failureCallbackPointer);
        if (clientPointer == IntPtr.Zero)
        {
            throw new Exception("Failed creating a client");
        }
    }

    private async Task<string?> command(IntPtr[] args, int argsCount, RequestType requestType)
    {
        // We need to pin the array in place, in order to ensure that the GC doesn't move it while the operation is running.
        GCHandle pinnedArray = GCHandle.Alloc(args, GCHandleType.Pinned);
        IntPtr pointer = pinnedArray.AddrOfPinnedObject();
        var message = messageContainer.GetMessageForCall(args, argsCount);
        CommandFfi(clientPointer, (ulong)message.Index, (int)requestType, pointer, (uint)argsCount);
        var result = await message;
        pinnedArray.Free();
        return result;
    }

    public async Task<string?> SetAsync(string key, string value)
    {
        var args = this.arrayPool.Rent(2);
        args[0] = Marshal.StringToHGlobalAnsi(key);
        args[1] = Marshal.StringToHGlobalAnsi(value);
        var result = await command(args, 2, RequestType.SetString);
        this.arrayPool.Return(args);
        return result;
    }

    public async Task<string?> GetAsync(string key)
    {
        var args = this.arrayPool.Rent(1);
        args[0] = Marshal.StringToHGlobalAnsi(key);
        var result = await command(args, 1, RequestType.GetString);
        this.arrayPool.Return(args);
        return result;
    }

    public void Dispose()
    {
        if (clientPointer == IntPtr.Zero)
        {
            return;
        }
        messageContainer.DisposeWithError(null);
        CloseClientFfi(clientPointer);
        clientPointer = IntPtr.Zero;
    }

    #endregion public methods

    #region private methods

    private void SuccessCallback(ulong index, IntPtr str)
    {
        var result = str == IntPtr.Zero ? null : Marshal.PtrToStringAnsi(str);
        // Work needs to be offloaded from the calling thread, because otherwise we might starve the client's thread pool.
        Task.Run(() =>
        {
            var message = messageContainer.GetMessage((int)index);
            message.SetResult(result);
        });
    }

    private void FailureCallback(ulong index)
    {
        // Work needs to be offloaded from the calling thread, because otherwise we might starve the client's thread pool.
        Task.Run(() =>
        {
            var message = messageContainer.GetMessage((int)index);
            message.SetException(new Exception("Operation failed"));
        });
    }

    ~AsyncClient() => Dispose();
    #endregion private methods

    #region private fields

    /// Held as a measure to prevent the delegate being garbage collected. These are delegated once
    /// and held in order to prevent the cost of marshalling on each function call.
    private readonly FailureAction failureCallbackDelegate;

    /// Held as a measure to prevent the delegate being garbage collected. These are delegated once
    /// and held in order to prevent the cost of marshalling on each function call.
    private readonly StringAction successCallbackDelegate;

    /// Raw pointer to the underlying native client.
    private IntPtr clientPointer;

    private readonly MessageContainer<string> messageContainer = new();
    private readonly ArrayPool<IntPtr> arrayPool = ArrayPool<IntPtr>.Shared;

    #endregion private fields

    #region FFI function declarations

    private delegate void StringAction(ulong index, IntPtr str);
    private delegate void FailureAction(ulong index);
    [DllImport("libglide_rs", CallingConvention = CallingConvention.Cdecl, EntryPoint = "command")]
    private static extern void CommandFfi(IntPtr client, ulong index, Int32 requestType, IntPtr args, UInt32 argCount);

    private delegate void IntAction(IntPtr arg);
    [DllImport("libglide_rs", CallingConvention = CallingConvention.Cdecl, EntryPoint = "create_client")]
    private static extern IntPtr CreateClientFfi(String host, UInt32 port, bool useTLS, IntPtr successCallback, IntPtr failureCallback);

    [DllImport("libglide_rs", CallingConvention = CallingConvention.Cdecl, EntryPoint = "close_client")]
    private static extern void CloseClientFfi(IntPtr client);

    #endregion

    #region RequestType

    // TODO: generate this with a bindings generator
    private enum RequestType
    {
        InvalidRequest = 0,
        CustomCommand = 1,
        GetString = 2,
        SetString = 3,
        Ping = 4,
        Info = 5,
        Del = 6,
        Select = 7,
        ConfigGet = 8,
        ConfigSet = 9,
        ConfigResetStat = 10,
        ConfigRewrite = 11,
        ClientGetName = 12,
        ClientGetRedir = 13,
        ClientId = 14,
        ClientInfo = 15,
        ClientKill = 16,
        ClientList = 17,
        ClientNoEvict = 18,
        ClientNoTouch = 19,
        ClientPause = 20,
        ClientReply = 21,
        ClientSetInfo = 22,
        ClientSetName = 23,
        ClientUnblock = 24,
        ClientUnpause = 25,
        Expire = 26,
        HashSet = 27,
        HashGet = 28,
        HashDel = 29,
        HashExists = 30,
        MGet = 31,
        MSet = 32,
        Incr = 33,
        IncrBy = 34,
        Decr = 35,
        IncrByFloat = 36,
        DecrBy = 37,
        HashGetAll = 38,
        HashMSet = 39,
        HashMGet = 40,
        HashIncrBy = 41,
        HashIncrByFloat = 42,
        LPush = 43,
        LPop = 44,
        RPush = 45,
        RPop = 46,
        LLen = 47,
        LRem = 48,
        LRange = 49,
        LTrim = 50,
        SAdd = 51,
        SRem = 52,
        SMembers = 53,
        SCard = 54,
        PExpireAt = 55,
        PExpire = 56,
        ExpireAt = 57,
        Exists = 58,
        Unlink = 59,
        TTL = 60,
        Zadd = 61,
        Zrem = 62,
        Zrange = 63,
        Zcard = 64,
        Zcount = 65,
        ZIncrBy = 66,
        ZScore = 67,
        Type = 68,
        HLen = 69,
        Echo = 70,
        ZPopMin = 71,
        Strlen = 72,
        Lindex = 73,
        ZPopMax = 74,
        XRead = 75,
        XAdd = 76,
        XReadGroup = 77,
        XAck = 78,
        XTrim = 79,
        XGroupCreate = 80,
        XGroupDestroy = 81,
        HSetNX = 82,
        SIsMember = 83,
        Hvals = 84,
        PTTL = 85,
        ZRemRangeByRank = 86,
        Persist = 87,
        ZRemRangeByScore = 88,
        Time = 89,
        Zrank = 90,
        Rename = 91,
        DBSize = 92,
        Brpop = 93,
    }

    #endregion
}
