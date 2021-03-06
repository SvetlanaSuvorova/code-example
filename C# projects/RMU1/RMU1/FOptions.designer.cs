namespace RMU1
{
    partial class Options
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Options));
            this.label9 = new System.Windows.Forms.Label();
            this.label10 = new System.Windows.Forms.Label();
            this.button4 = new System.Windows.Forms.Button();
            this.errPrDepth = new System.Windows.Forms.ErrorProvider(this.components);
            this.label8 = new System.Windows.Forms.Label();
            this.label7 = new System.Windows.Forms.Label();
            this.folderBrowserDialog = new System.Windows.Forms.FolderBrowserDialog();
            this.timerOpt = new System.Windows.Forms.Timer(this.components);
            this.imageList = new System.Windows.Forms.ImageList(this.components);
            this.errPrDiam = new System.Windows.Forms.ErrorProvider(this.components);
            this.tabPage4 = new System.Windows.Forms.TabPage();
            this.chbAdjustmen = new System.Windows.Forms.CheckBox();
            this.chbBackground = new System.Windows.Forms.CheckBox();
            this.chbPositive = new System.Windows.Forms.CheckBox();
            this.button2 = new System.Windows.Forms.Button();
            this.tabControl = new System.Windows.Forms.TabControl();
            this.button6 = new System.Windows.Forms.Button();
            ((System.ComponentModel.ISupportInitialize)(this.errPrDepth)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.errPrDiam)).BeginInit();
            this.tabPage4.SuspendLayout();
            this.tabControl.SuspendLayout();
            this.SuspendLayout();
            // 
            // label9
            // 
            this.label9.AutoSize = true;
            this.label9.Location = new System.Drawing.Point(210, 41);
            this.label9.Name = "label9";
            this.label9.Size = new System.Drawing.Size(41, 13);
            this.label9.TabIndex = 8;
            this.label9.Text = "Блок 2";
            // 
            // label10
            // 
            this.label10.AutoSize = true;
            this.label10.Location = new System.Drawing.Point(90, 41);
            this.label10.Name = "label10";
            this.label10.Size = new System.Drawing.Size(44, 13);
            this.label10.TabIndex = 7;
            this.label10.Text = "Блок 1 ";
            // 
            // button4
            // 
            this.button4.Location = new System.Drawing.Point(198, 185);
            this.button4.Name = "button4";
            this.button4.Size = new System.Drawing.Size(193, 36);
            this.button4.TabIndex = 5;
            this.button4.Text = "Выполнить контроль температуры...";
            this.button4.UseVisualStyleBackColor = true;
            // 
            // errPrDepth
            // 
            this.errPrDepth.ContainerControl = this;
            // 
            // label8
            // 
            this.label8.AutoSize = true;
            this.label8.Location = new System.Drawing.Point(450, 41);
            this.label8.Name = "label8";
            this.label8.Size = new System.Drawing.Size(41, 13);
            this.label8.TabIndex = 9;
            this.label8.Text = "Блок 4";
            // 
            // label7
            // 
            this.label7.AutoSize = true;
            this.label7.Location = new System.Drawing.Point(330, 41);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(41, 13);
            this.label7.TabIndex = 10;
            this.label7.Text = "Блок 3";
            // 
            // timerOpt
            // 
            this.timerOpt.Interval = 50;
            // 
            // imageList
            // 
            this.imageList.ImageStream = ((System.Windows.Forms.ImageListStreamer)(resources.GetObject("imageList.ImageStream")));
            this.imageList.TransparentColor = System.Drawing.Color.Transparent;
            this.imageList.Images.SetKeyName(0, "IndicatorGrey1.bmp");
            this.imageList.Images.SetKeyName(1, "IncicatorGreen.bmp");
            this.imageList.Images.SetKeyName(2, "IndicatorRedDark.bmp");
            this.imageList.Images.SetKeyName(3, "IndicatorRedLigt.bmp");
            this.imageList.Images.SetKeyName(4, "Backgr.bmp");
            // 
            // errPrDiam
            // 
            this.errPrDiam.ContainerControl = this;
            // 
            // tabPage4
            // 
            this.tabPage4.Controls.Add(this.chbAdjustmen);
            this.tabPage4.Controls.Add(this.button6);
            this.tabPage4.Controls.Add(this.chbBackground);
            this.tabPage4.Controls.Add(this.button2);
            this.tabPage4.Controls.Add(this.chbPositive);
            this.tabPage4.Location = new System.Drawing.Point(4, 22);
            this.tabPage4.Name = "tabPage4";
            this.tabPage4.Size = new System.Drawing.Size(484, 329);
            this.tabPage4.TabIndex = 3;
            this.tabPage4.Text = "Выдержка";
            this.tabPage4.UseVisualStyleBackColor = true;
            // 
            // chbAdjustmen
            // 
            this.chbAdjustmen.AutoSize = true;
            this.chbAdjustmen.Location = new System.Drawing.Point(150, 140);
            this.chbAdjustmen.Name = "chbAdjustmen";
            this.chbAdjustmen.Size = new System.Drawing.Size(200, 17);
            this.chbAdjustmen.TabIndex = 24;
            this.chbAdjustmen.Text = "Измерять с выравниванием фона";
            this.chbAdjustmen.UseVisualStyleBackColor = true;
            // 
            // chbBackground
            // 
            this.chbBackground.AutoSize = true;
            this.chbBackground.Location = new System.Drawing.Point(432, 123);
            this.chbBackground.Name = "chbBackground";
            this.chbBackground.Size = new System.Drawing.Size(180, 17);
            this.chbBackground.TabIndex = 23;
            this.chbBackground.Text = "Измерять с вычитанием фона";
            this.chbBackground.UseVisualStyleBackColor = true;
            this.chbBackground.Visible = false;
            // 
            // chbPositive
            // 
            this.chbPositive.AutoSize = true;
            this.chbPositive.Location = new System.Drawing.Point(150, 94);
            this.chbPositive.Name = "chbPositive";
            this.chbPositive.Size = new System.Drawing.Size(69, 17);
            this.chbPositive.TabIndex = 22;
            this.chbPositive.Text = "Позитив";
            this.chbPositive.UseVisualStyleBackColor = true;
            // 
            // button2
            // 
            this.button2.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            this.button2.Location = new System.Drawing.Point(275, 236);
            this.button2.Name = "button2";
            this.button2.Size = new System.Drawing.Size(75, 23);
            this.button2.TabIndex = 22;
            this.button2.Text = "Cancel";
            this.button2.UseVisualStyleBackColor = true;
            this.button2.Click += new System.EventHandler(this.buttonCancel_Click);
            // 
            // tabControl
            // 
            this.tabControl.Controls.Add(this.tabPage4);
            this.tabControl.Dock = System.Windows.Forms.DockStyle.Fill;
            this.tabControl.Location = new System.Drawing.Point(0, 0);
            this.tabControl.Name = "tabControl";
            this.tabControl.SelectedIndex = 0;
            this.tabControl.Size = new System.Drawing.Size(492, 355);
            this.tabControl.TabIndex = 6;
            // 
            // button6
            // 
            this.button6.DialogResult = System.Windows.Forms.DialogResult.OK;
            this.button6.Location = new System.Drawing.Point(150, 236);
            this.button6.Name = "button6";
            this.button6.Size = new System.Drawing.Size(75, 23);
            this.button6.TabIndex = 21;
            this.button6.Text = "OK";
            this.button6.UseVisualStyleBackColor = true;
            this.button6.Click += new System.EventHandler(this.bOK_Click);
            // 
            // Options
            // 
            this.ClientSize = new System.Drawing.Size(492, 355);
            this.Controls.Add(this.tabControl);
            this.Controls.Add(this.label9);
            this.Controls.Add(this.label10);
            this.Controls.Add(this.button4);
            this.Controls.Add(this.label8);
            this.Controls.Add(this.label7);
            this.Name = "Options";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            this.Text = "Установка параметров системы";
            this.Load += new System.EventHandler(this.Options_Load);
            ((System.ComponentModel.ISupportInitialize)(this.errPrDepth)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.errPrDiam)).EndInit();
            this.tabPage4.ResumeLayout(false);
            this.tabPage4.PerformLayout();
            this.tabControl.ResumeLayout(false);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Label label9;
        private System.Windows.Forms.Label label10;
        private System.Windows.Forms.Button button4;
        public System.Windows.Forms.ErrorProvider errPrDepth;
        private System.Windows.Forms.Label label8;
        private System.Windows.Forms.Label label7;
        private System.Windows.Forms.FolderBrowserDialog folderBrowserDialog;
        private System.Windows.Forms.Timer timerOpt;
        private System.Windows.Forms.ImageList imageList;
        private System.Windows.Forms.ErrorProvider errPrDiam;
        private System.Windows.Forms.TabControl tabControl;
        private System.Windows.Forms.TabPage tabPage4;
        private System.Windows.Forms.CheckBox chbBackground;
        private System.Windows.Forms.CheckBox chbPositive;
        private System.Windows.Forms.Button button2;
		private System.Windows.Forms.CheckBox chbAdjustmen;
        private System.Windows.Forms.Button button6;

    }
}