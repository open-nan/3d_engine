#![allow(static_mut_refs)]

use miniz_oxide::inflate::decompress_to_vec;

const MAGIC: &[u8; 4] = b"NGB1";
const METHOD_DEFLATE_RAW: u8 = 1;

#[derive(Clone)]
struct Entry {
    name_start: usize,
    name_len: usize,
    data_start: usize,
    compressed_len: usize,
    uncompressed_len: usize,
    method: u8,
}

static mut BUNDLE: Vec<u8> = Vec::new();
static mut ENTRIES: Vec<Entry> = Vec::new();
static mut OUTPUT: Vec<u8> = Vec::new();
static mut ERROR: Vec<u8> = Vec::new();

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(len);
    let ptr = buffer.as_mut_ptr();
    core::mem::forget(buffer);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn free(ptr: *mut u8, len: usize) {
    if !ptr.is_null() && len > 0 {
        drop(Vec::from_raw_parts(ptr, 0, len));
    }
}

#[no_mangle]
pub unsafe extern "C" fn bundle_load(ptr: *const u8, len: usize) -> i32 {
    clear_error();
    if ptr.is_null() || len < 8 {
        set_error("bundle is empty");
        return 0;
    }

    let bytes = core::slice::from_raw_parts(ptr, len);
    if &bytes[0..4] != MAGIC {
        set_error("invalid bundle magic");
        return 0;
    }

    let count = read_u32(bytes, 4) as usize;
    let mut offset = 8;
    let mut entries = Vec::with_capacity(count);

    for _ in 0..count {
        if offset + 15 > bytes.len() {
            set_error("truncated bundle directory");
            return 0;
        }

        let name_len = read_u16(bytes, offset) as usize;
        offset += 2;
        let method = bytes[offset];
        offset += 1;
        offset += 1;
        let uncompressed_len = read_u32(bytes, offset) as usize;
        offset += 4;
        let compressed_len = read_u32(bytes, offset) as usize;
        offset += 4;
        offset += 4;

        let name_start = offset;
        let name_end = name_start.saturating_add(name_len);
        if name_end > bytes.len() || core::str::from_utf8(&bytes[name_start..name_end]).is_err() {
            set_error("invalid bundle entry name");
            return 0;
        }
        offset = name_end;

        let data_start = offset;
        let data_end = data_start.saturating_add(compressed_len);
        if data_end > bytes.len() {
            set_error("truncated bundle entry data");
            return 0;
        }
        offset = data_end;

        entries.push(Entry {
            name_start,
            name_len,
            data_start,
            compressed_len,
            uncompressed_len,
            method,
        });
    }

    BUNDLE = bytes.to_vec();
    ENTRIES = entries;
    OUTPUT.clear();
    1
}

#[no_mangle]
pub unsafe extern "C" fn bundle_file_count() -> usize {
    ENTRIES.len()
}

#[no_mangle]
pub unsafe extern "C" fn bundle_file_name_ptr(index: usize) -> *const u8 {
    match ENTRIES.get(index) {
        Some(entry) => BUNDLE.as_ptr().add(entry.name_start),
        None => core::ptr::null()
    }
}

#[no_mangle]
pub unsafe extern "C" fn bundle_file_name_len(index: usize) -> usize {
    ENTRIES.get(index).map(|entry| entry.name_len).unwrap_or(0)
}

#[no_mangle]
pub unsafe extern "C" fn bundle_file_uncompressed_len(index: usize) -> usize {
    ENTRIES.get(index).map(|entry| entry.uncompressed_len).unwrap_or(0)
}

#[no_mangle]
pub unsafe extern "C" fn bundle_decompress(index: usize) -> i32 {
    clear_error();
    let Some(entry) = ENTRIES.get(index).cloned() else {
        set_error("bundle entry index out of range");
        return 0;
    };

    if entry.method != METHOD_DEFLATE_RAW {
        set_error("unsupported bundle compression method");
        return 0;
    }

    let start = entry.data_start;
    let end = start + entry.compressed_len;
    let compressed = &BUNDLE[start..end];
    match decompress_to_vec(compressed) {
        Ok(output) if output.len() == entry.uncompressed_len => {
            OUTPUT = output;
            1
        }
        Ok(_) => {
            set_error("bundle entry length mismatch");
            0
        }
        Err(_) => {
            set_error("bundle deflate decode failed");
            0
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn bundle_output_ptr() -> *const u8 {
    OUTPUT.as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn bundle_output_len() -> usize {
    OUTPUT.len()
}

#[no_mangle]
pub unsafe extern "C" fn bundle_error_ptr() -> *const u8 {
    ERROR.as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn bundle_error_len() -> usize {
    ERROR.len()
}

fn read_u16(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}

fn read_u32(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ])
}

unsafe fn clear_error() {
    ERROR.clear();
}

unsafe fn set_error(message: &str) {
    ERROR = message.as_bytes().to_vec();
}
