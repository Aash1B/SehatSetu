using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class Program {
    public static void Main() {
        string dir = @"c:\Users\shubh\Desktop\React\Webtech\SehatSetu\frontend\public";
        string[] files = new string[] { "z.jpeg.jpeg", "x.jpeg.jpeg", "c.jpeg.jpeg", "v.jpeg.jpeg", "b.jpeg.jpeg", "n.jpeg.jpeg", "m.jpeg.jpeg", "q.jpeg.jpeg" };
        foreach (string f in files) {
            string inPath = Path.Combine(dir, f);
            string outPath = Path.Combine(dir, f.Substring(0, 1) + "_clean.png");
            if (File.Exists(inPath)) {
                using (Bitmap bmp = new Bitmap(inPath)) {
                    using (Bitmap newBmp = new Bitmap(bmp.Width, bmp.Height, PixelFormat.Format32bppArgb)) {
                        for (int x = 0; x < bmp.Width; x++) {
                            for (int y = 0; y < bmp.Height; y++) {
                                Color c = bmp.GetPixel(x, y);
                                if (c.R < 65 && c.G < 65 && c.B < 65) {
                                    newBmp.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                                } else {
                                    newBmp.SetPixel(x, y, c);
                                }
                            }
                        }
                        newBmp.Save(outPath, ImageFormat.Png);
                        Console.WriteLine("Saved " + outPath);
                    }
                }
            }
        }
    }
}
