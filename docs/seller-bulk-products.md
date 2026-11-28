# Seller Partner — Bulk Product CSV

CSV is the canonical interchange format for both bulk product creation and bulk editing in EXGARASI.

## Columns

`title,description,details,category,sku,brand,series,model,year,condition,price,currency,stock,image_1,image_2,image_3,image_4,image_5`

- One CSV row represents one listing.
- `title`, `category`, `sku`, `price`, `currency`, `stock`, and `condition` are required for a new listing.
- `sku` is the seller's own SKU. It may use any format, but must be unique within that seller's store.
- `category` must match an active EXGARASI category name.
- `condition` accepts `new`, `used`, or `refurbished`.
- `currency` accepts `IDR` or `USD`.
- `price` is a whole-number amount in the selected currency. `stock` is a non-negative whole number.
- `details` is optional free text. Quote the CSV cell when it contains commas or line breaks.
- `image_1` through `image_5` accept publicly fetchable HTTPS image URLs. The first image is the cover image; later columns are additional gallery images.
- Leave unused image columns empty.

## Image import behavior

During import, EXGARASI validates each image URL and its response, then copies accepted image bytes into the EXGARASI Cloudflare R2 media bucket. Listings store R2 object keys, not permanent dependencies on third-party image hosts. Import must reject private-network destinations, non-HTTPS URLs, unsupported content types, oversized files, redirects to disallowed destinations, and URLs that require an interactive login.

A Google Drive share URL is not guaranteed to be a direct image URL. The seller must make the file publicly readable; the importer must resolve supported Drive share links safely or report that the image URL is unsupported. Never ask sellers to make sensitive/private documents public.

## Bulk import and edit safety

1. Parse and validate the entire file before writing any listing.
2. Show a row-by-row preview, including fetched image thumbnails and validation errors.
3. Do not write any rows until the seller confirms the preview.
4. New listings start in `pending_review`; they must not become public until moderation approves them.
5. A duplicate seller SKU in the same store is an error. The same SKU may exist in a different store.
6. For bulk edit, identify existing listings by the seller's SKU plus the authenticated store scope (and preferably include an immutable listing ID in the export file). Never accept a store ID or owner ID from CSV as authority.
7. Revalidate ownership and all fields at commit time. A seller cannot edit another store's listings or change moderation status through CSV.
8. Return a result report with successful rows and row-level failures. Never silently skip a row.
9. Bulk edit must preview every proposed change before applying it. Changes to moderated content must follow the moderation policy.

## Template

Download the blank template at `/templates/exgarasi-products-template.csv`.

This document describes the agreed product-import contract. Runtime import, R2 ingestion, preview, and bulk-edit UI/API must be implemented and tested before this feature is considered available to sellers.
