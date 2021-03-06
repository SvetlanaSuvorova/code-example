using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using System.IO;
using System.Resources;
using System.Reflection;
using System.Security.Permissions;
using System.Runtime.InteropServices;

namespace RMU1
{
    public partial class Options : Form
    {
        private bool isNumeric = false;
        public bool isCloseOK = true;
        public double depth, diameter;
        public int mode, frequency;
        public bool positive, background, math_accumulate, adjustment;
        public int shift_value = 1, math_interap;
        public Options()
        {
            InitializeComponent();
            int pr = (this.Width - (100 * 4)) / 5;
        }

        private void Options_FormClosing(object sender, FormClosingEventArgs e)
        {
            timerOpt.Stop();

            if (isCloseOK == true) 
            {
                e.Cancel = true;
            }
        }

        private void tbxDepth_KeyDown(object sender, KeyEventArgs e)
        {
            TextBox tbx = (TextBox)sender;
            bool isAlreadyPoint = (tbx.Text.IndexOf(',') == -1 && tbx.Text.IndexOf('.') == -1) ? false : true;
            if ((e.KeyCode >= Keys.D0 && e.KeyCode <= Keys.D9) || e.KeyCode == Keys.Back || e.KeyCode == Keys.Delete)
            {
                isNumeric = true;
            }
            else if (InputLanguage.CurrentInputLanguage.Culture.Name.Substring(0, 2) == "ru")
            {
                if ((e.KeyValue == 191) && !(isAlreadyPoint))
                {
                    isNumeric = true;
                }
            }
            else if ((e.KeyCode == Keys.Oemcomma  || e.KeyCode == Keys.OemPeriod) && !(isAlreadyPoint))
            {
                isNumeric = true;
            }
        }

        private void tbxDepth_KeyPress(object sender, KeyPressEventArgs e)
        {
            if (!isNumeric)
            {
                e.Handled = true;
            }
            isNumeric = false;
        }

        private void bOK_Click(object sender, EventArgs e)
        {
           try
            {
                positive = chbPositive.Checked;
                background = chbBackground.Checked;
				adjustment = chbAdjustmen.Checked;
          
            }
            catch
            {
                isCloseOK = false;
            }
        }

        private bool CheckValidData(String nameSender, double dText)
        {
            return true;
        }

        private void tbx_Leave(object sender, EventArgs e)
        {
            TextBox tbx = (TextBox)sender;
            String strTemp = (tbx.Text.ToString().Length == 0) ? "0" : tbx.Text.ToString();
            double dText = 0;
            try
            {
                if (InputLanguage.CurrentInputLanguage.Culture.Name.Substring(0, 2) == "ru")
                {
                    strTemp = strTemp.Replace('.', ',');
                }
                dText = Convert.ToDouble(strTemp);
            }
            catch
            {
            }
            CheckValidData(tbx.Name, dText);

        }
        private void buttonCancel_Click(object sender, EventArgs e)
        {
            isCloseOK = false;

        }

        private void Options_Load(object sender, EventArgs e)
        {
            chbPositive.Checked = positive;
            chbBackground.Checked = background;
			chbAdjustmen.Checked = adjustment;
        }
}