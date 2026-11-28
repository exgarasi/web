# Seller Partner — Bulk Product CSV

CSV preview and export are available in the seller dashboard.

## Columns

`listing_id,title,description,details,category,sku,brand,series,model,year,condition,price,currency,stock,image_1,image_2,image_3,image_4,image_5`

- `title`, `category`, `sku`, `condition`, `price`, `currency`, and `stock` are required.
- Category and brand must match catalog entries.
- Condition accepts `new`, `used`, or `refurbished`; currency accepts `IDR` or `USD`.
- Price and stock are whole numbers. Each CSV is limited to 2 MB and 500 rows.
- The preview endpoint validates the entire file and store membership; it does not write product or image data.
- Export is scoped to a store the authenticated user belongs to and neutralizes spreadsheet formula prefixes.

## Media and commit

Image ingestion and product commit remain disabled until outbound URL fetching is hardened against SSRF and the isolated Preview R2 binding is verified. Do not point Preview at the Production bucket. New listings must remain pending moderation; existing listing edits must be re-reviewed.

The blank template is available at `/templates/exgarasi-products-template.csv`.
